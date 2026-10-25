package com.sprind.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.sprind.app.widget.SprindWidgetPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugins must be registered before the bridge starts
        registerPlugin(SprindWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
