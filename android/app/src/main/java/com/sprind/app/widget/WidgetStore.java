package com.sprind.app.widget;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * The flashcard widget's data: the word list the app sends (lib/widget/home-widget.ts),
 * the card the widget is on, and the downloaded audio and pictures, so the widget
 * works offline and without the app running.
 */
final class WidgetStore {

    private static final String TAG = "SprindWidget";
    private static final String PREFS = "sprind_widget";
    private static final String KEY_PAYLOAD = "payload";
    private static final String KEY_INDEX = "index";
    // Long side of a stored picture: sharp on a 2x2 widget, small enough for RemoteViews
    private static final int IMAGE_MAX_PX = 360;

    private static final ExecutorService downloader = Executors.newSingleThreadExecutor();

    static final class Word {
        int id;
        String word;
        String translation;
        String audio;
        String image;
    }

    static final class Deck {
        String key;
        String label;
        String empty;
        List<Word> words = new ArrayList<>();
    }

    private WidgetStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static Deck load(Context context) {
        String payload = prefs(context).getString(KEY_PAYLOAD, null);
        if (payload == null) return null;
        try {
            return parse(payload);
        } catch (JSONException e) {
            return null;
        }
    }

    private static Deck parse(String payload) throws JSONException {
        JSONObject json = new JSONObject(payload);
        Deck deck = new Deck();
        deck.key = json.optString("key", "");
        deck.label = json.optString("label", "");
        deck.empty = json.optString("empty", "");
        JSONArray words = json.getJSONArray("words");
        for (int i = 0; i < words.length(); i++) {
            JSONObject w = words.getJSONObject(i);
            Word word = new Word();
            word.id = w.getInt("id");
            word.word = w.optString("word", "");
            word.translation = w.optString("translation", "");
            word.audio = w.isNull("audio") ? null : w.optString("audio", null);
            word.image = w.isNull("image") ? null : w.optString("image", null);
            deck.words.add(word);
        }
        return deck;
    }

    /** Stores a new word list. A different list starts again from its first card. */
    static void save(Context context, String payload) throws JSONException {
        Deck next = parse(payload);
        Deck previous = load(context);
        SharedPreferences.Editor editor = prefs(context).edit().putString(KEY_PAYLOAD, payload);
        if (previous == null || !previous.key.equals(next.key)) editor.putInt(KEY_INDEX, 0);
        editor.apply();
    }

    static int index(Context context, Deck deck) {
        int size = deck.words.size();
        if (size == 0) return 0;
        int i = prefs(context).getInt(KEY_INDEX, 0) % size;
        return i < 0 ? i + size : i;
    }

    static void move(Context context, Deck deck, int step) {
        int size = deck.words.size();
        if (size == 0) return;
        int next = ((index(context, deck) + step) % size + size) % size;
        prefs(context).edit().putInt(KEY_INDEX, next).apply();
    }

    private static File dir(Context context, String name) {
        File dir = new File(new File(context.getFilesDir(), "widget"), name);
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    static File imageFile(Context context, int id) {
        return new File(dir(context, "img"), id + ".png");
    }

    /** The word's downloaded pronunciation (mp3 or wav), or null. */
    static File audioFile(Context context, int id) {
        File[] files = dir(context, "audio").listFiles();
        if (files == null) return null;
        String prefix = id + ".";
        for (File f : files) {
            if (f.getName().startsWith(prefix) && f.length() > 0) return f;
        }
        return null;
    }

    /**
     * Downloads the audio and pictures the current list is missing, drops files of
     * words no longer in it, then redraws the widget. Runs off the main thread.
     */
    static void downloadMissing(Context context) {
        final Context app = context.getApplicationContext();
        downloader.execute(() -> {
            Deck deck = load(app);
            if (deck == null) return;
            Set<String> keep = new HashSet<>();
            int done = 0;
            for (Word w : deck.words) {
                keep.add(String.valueOf(w.id));
                try {
                    if (w.image != null && !imageFile(app, w.id).exists()) saveImage(app, w);
                    if (w.audio != null && audioFile(app, w.id) == null) saveAudio(app, w);
                } catch (Exception e) {
                    Log.w(TAG, "download failed for word " + w.id + ": " + e.getMessage());
                }
                // Show the first cards' art as soon as it's there
                if (++done == 3) FlashcardWidgetProvider.updateAll(app);
            }
            prune(dir(app, "img"), keep);
            prune(dir(app, "audio"), keep);
            FlashcardWidgetProvider.updateAll(app);
        });
    }

    private static void prune(File dir, Set<String> keep) {
        File[] files = dir.listFiles();
        if (files == null) return;
        for (File f : files) {
            String name = f.getName();
            int dot = name.indexOf('.');
            if (!keep.contains(dot > 0 ? name.substring(0, dot) : name)) f.delete();
        }
    }

    private static HttpURLConnection open(String url) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(20000);
        if (conn.getResponseCode() != 200) {
            conn.disconnect();
            throw new Exception("HTTP " + conn.getResponseCode());
        }
        return conn;
    }

    private static byte[] read(HttpURLConnection conn) throws Exception {
        try (InputStream in = conn.getInputStream()) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        } finally {
            conn.disconnect();
        }
    }

    private static void saveImage(Context context, Word w) throws Exception {
        byte[] bytes = read(open(w.image));
        Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        if (bitmap == null) return;
        int longSide = Math.max(bitmap.getWidth(), bitmap.getHeight());
        if (longSide > IMAGE_MAX_PX) {
            float scale = IMAGE_MAX_PX / (float) longSide;
            bitmap = Bitmap.createScaledBitmap(bitmap,
                Math.max(1, Math.round(bitmap.getWidth() * scale)),
                Math.max(1, Math.round(bitmap.getHeight() * scale)), true);
        }
        File tmp = new File(imageFile(context, w.id).getPath() + ".tmp");
        try (FileOutputStream out = new FileOutputStream(tmp)) {
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
        }
        tmp.renameTo(imageFile(context, w.id));
    }

    private static void saveAudio(Context context, Word w) throws Exception {
        HttpURLConnection conn = open(w.audio);
        String type = conn.getContentType();
        if (type != null && (type.contains("json") || type.contains("html"))) {
            conn.disconnect();
            return;
        }
        String ext = type != null && type.contains("mpeg") ? "mp3" : "wav";
        byte[] bytes = read(conn);
        if (bytes.length == 0) return;
        File tmp = new File(dir(context, "audio"), w.id + ".tmp");
        try (FileOutputStream out = new FileOutputStream(tmp)) {
            out.write(bytes);
        }
        tmp.renameTo(new File(dir(context, "audio"), w.id + "." + ext));
    }
}
