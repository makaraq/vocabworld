package com.sprind.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.view.View;
import android.widget.RemoteViews;

import com.sprind.app.MainActivity;
import com.sprind.app.R;

import java.io.File;

/**
 * Home-screen flashcard: the word being learned, its translation and picture.
 * Arrows page through the list the app chose (Manage Account → Home-screen
 * widget); tapping the card plays the word, tapping again stops it.
 * Every copy of the widget shows the same card.
 */
public class FlashcardWidgetProvider extends AppWidgetProvider {

    private static final String ACTION_PREV = "com.sprind.app.widget.PREV";
    private static final String ACTION_NEXT = "com.sprind.app.widget.NEXT";
    private static final String ACTION_PLAY = "com.sprind.app.widget.PLAY";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        manager.updateAppWidget(appWidgetIds, build(context));
    }

    @Override
    public void onEnabled(Context context) {
        // Fetch anything missing, e.g. after the app was reinstalled
        WidgetStore.downloadMissing(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (ACTION_PREV.equals(action) || ACTION_NEXT.equals(action)) {
            WidgetStore.Deck deck = WidgetStore.load(context);
            if (deck == null) return;
            WidgetAudio.stop();
            WidgetStore.move(context, deck, ACTION_NEXT.equals(action) ? 1 : -1);
            updateAll(context);
        } else if (ACTION_PLAY.equals(action)) {
            WidgetStore.Deck deck = WidgetStore.load(context);
            if (deck == null || deck.words.isEmpty()) return;
            WidgetStore.Word word = deck.words.get(WidgetStore.index(context, deck));
            WidgetAudio.toggle(context, word, goAsync());
        }
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, FlashcardWidgetProvider.class));
        if (ids.length > 0) manager.updateAppWidget(ids, build(context));
    }

    static int installedCount(Context context) {
        return AppWidgetManager.getInstance(context)
            .getAppWidgetIds(new ComponentName(context, FlashcardWidgetProvider.class)).length;
    }

    private static PendingIntent broadcast(Context context, String action, int requestCode) {
        Intent intent = new Intent(context, FlashcardWidgetProvider.class).setAction(action);
        return PendingIntent.getBroadcast(context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static RemoteViews build(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_flashcard);
        PendingIntent openApp = PendingIntent.getActivity(context, 0,
            new Intent(context, MainActivity.class), PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_header, openApp);

        WidgetStore.Deck deck = WidgetStore.load(context);
        if (deck == null || deck.words.isEmpty()) {
            views.setViewVisibility(R.id.widget_card_content, View.GONE);
            views.setViewVisibility(R.id.widget_footer, View.INVISIBLE);
            views.setViewVisibility(R.id.widget_play, View.GONE);
            views.setViewVisibility(R.id.widget_empty, View.VISIBLE);
            if (deck != null && !deck.empty.isEmpty()) views.setTextViewText(R.id.widget_empty, deck.empty);
            views.setOnClickPendingIntent(R.id.widget_card, openApp);
            return views;
        }

        int index = WidgetStore.index(context, deck);
        WidgetStore.Word word = deck.words.get(index);
        views.setViewVisibility(R.id.widget_empty, View.GONE);
        views.setViewVisibility(R.id.widget_card_content, View.VISIBLE);
        views.setViewVisibility(R.id.widget_footer, View.VISIBLE);
        views.setViewVisibility(R.id.widget_play, View.VISIBLE);
        views.setTextViewText(R.id.widget_label, deck.label.isEmpty() ? "Sprind" : deck.label);
        views.setTextViewText(R.id.widget_word, word.word);
        views.setTextViewText(R.id.widget_translation, word.translation);
        views.setViewVisibility(R.id.widget_translation, word.translation.isEmpty() ? View.GONE : View.VISIBLE);
        views.setTextViewText(R.id.widget_counter, (index + 1) + " / " + deck.words.size());

        File image = WidgetStore.imageFile(context, word.id);
        Bitmap bitmap = image.exists() ? BitmapFactory.decodeFile(image.getPath()) : null;
        if (bitmap != null) {
            views.setImageViewBitmap(R.id.widget_image, bitmap);
            views.setViewVisibility(R.id.widget_image, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_image, View.GONE);
        }

        boolean playing = WidgetAudio.isPlaying(word.id);
        views.setImageViewResource(R.id.widget_play, playing ? R.drawable.ic_widget_stop : R.drawable.ic_widget_play);
        PendingIntent play = broadcast(context, ACTION_PLAY, 3);
        views.setOnClickPendingIntent(R.id.widget_card, play);
        views.setOnClickPendingIntent(R.id.widget_play, play);
        views.setOnClickPendingIntent(R.id.widget_prev, broadcast(context, ACTION_PREV, 1));
        views.setOnClickPendingIntent(R.id.widget_next, broadcast(context, ACTION_NEXT, 2));
        return views;
    }
}
