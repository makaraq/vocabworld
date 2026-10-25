package com.sprind.app.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;

import java.io.File;

/**
 * Plays a word's pronunciation straight from the widget, without opening the app.
 * The tap's broadcast is kept alive (goAsync) for the length of the clip, which is
 * what keeps the process, and the player, running. A second tap stops it.
 */
final class WidgetAudio {

    // goAsync() allows ~10 s before the broadcast counts as stuck; clips are 1-3 s
    private static final long MAX_PLAY_MS = 8000;

    private static final Handler handler = new Handler(Looper.getMainLooper());
    private static MediaPlayer player;
    private static int playingId = -1;
    private static BroadcastReceiver.PendingResult pending;
    private static Context appContext;
    private static final Runnable timeout = () -> stop();

    private WidgetAudio() {}

    static boolean isPlaying(int wordId) {
        return playingId == wordId;
    }

    /** Called on the main thread from the widget's tap broadcast. */
    static void toggle(Context context, WidgetStore.Word word, BroadcastReceiver.PendingResult result) {
        appContext = context.getApplicationContext();
        if (playingId == word.id) {
            stop();
            result.finish();
            return;
        }
        stop();

        File file = WidgetStore.audioFile(appContext, word.id);
        if (file == null && word.audio == null) {
            result.finish();
            return;
        }
        pending = result;
        playingId = word.id;
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build());
            // Not downloaded yet (just added, or offline then): stream it
            player.setDataSource(file != null ? file.getPath() : word.audio);
            player.setOnPreparedListener(MediaPlayer::start);
            player.setOnCompletionListener(mp -> stop());
            player.setOnErrorListener((mp, what, extra) -> {
                stop();
                return true;
            });
            player.prepareAsync();
            handler.postDelayed(timeout, MAX_PLAY_MS);
        } catch (Exception e) {
            stop();
            return;
        }
        FlashcardWidgetProvider.updateAll(appContext);
    }

    /** Stops playback (if any) and puts the play icon back. */
    static void stop() {
        handler.removeCallbacks(timeout);
        boolean wasPlaying = playingId != -1;
        playingId = -1;
        if (player != null) {
            try {
                player.release();
            } catch (Exception ignored) {}
            player = null;
        }
        if (wasPlaying && appContext != null) FlashcardWidgetProvider.updateAll(appContext);
        if (pending != null) {
            pending.finish();
            pending = null;
        }
    }
}
