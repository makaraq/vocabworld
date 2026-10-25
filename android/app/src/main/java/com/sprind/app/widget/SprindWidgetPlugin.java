package com.sprind.app.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Bridge for lib/widget/home-widget.ts: hands the widget its word list. */
@CapacitorPlugin(name = "SprindWidget")
public class SprindWidgetPlugin extends Plugin {

    @Override
    public void load() {
        // Finish any download the last session didn't
        WidgetStore.downloadMissing(getContext());
    }

    @PluginMethod
    public void setWords(PluginCall call) {
        String payload = call.getString("payload");
        if (payload == null) {
            call.reject("payload is required");
            return;
        }
        try {
            WidgetStore.save(getContext(), payload);
        } catch (Exception e) {
            call.reject("Invalid widget payload", e);
            return;
        }
        FlashcardWidgetProvider.updateAll(getContext());
        WidgetStore.downloadMissing(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", true);
        result.put("installed", FlashcardWidgetProvider.installedCount(getContext()));
        result.put("canPin", canPin());
        call.resolve(result);
    }

    @PluginMethod
    public void requestPin(PluginCall call) {
        boolean requested = false;
        if (canPin()) {
            requested = AppWidgetManager.getInstance(getContext()).requestPinAppWidget(
                new ComponentName(getContext(), FlashcardWidgetProvider.class), null, null);
        }
        JSObject result = new JSObject();
        result.put("requested", requested);
        call.resolve(result);
    }

    private boolean canPin() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && AppWidgetManager.getInstance(getContext()).isRequestPinAppWidgetSupported();
    }
}
