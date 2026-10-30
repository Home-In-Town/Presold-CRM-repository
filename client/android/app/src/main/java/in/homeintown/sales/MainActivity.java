package in.homeintown.sales;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onStart() {
        super.onStart();
        
        // Register custom plugins
        registerPlugin(PhoneCallPlugin.class);
    }
}
