package in.homeintown.sales;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "PhoneCall",
    permissions = {
        @Permission(strings = {Manifest.permission.CALL_PHONE}, alias = "call")
    }
)
public class PhoneCallPlugin extends Plugin {

    @PluginMethod
    public void makeCall(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }

        // Check if we have CALL_PHONE permission
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CALL_PHONE) 
            != PackageManager.PERMISSION_GRANTED) {
            
            // Request permission
            requestPermissionForAlias("call", call, "callPermissionCallback");
            return;
        }

        // Make the call
        try {
            Intent intent = new Intent(Intent.ACTION_CALL);
            intent.setData(Uri.parse("tel:" + phoneNumber));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "Call initiated");
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to initiate call: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openDialer(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }

        try {
            // Open dialer with number pre-filled (doesn't require permission)
            Intent intent = new Intent(Intent.ACTION_DIAL);
            intent.setData(Uri.parse("tel:" + phoneNumber));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "Dialer opened");
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to open dialer: " + e.getMessage());
        }
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
    }

    private void callPermissionCallback(PluginCall call) {
        if (call == null) {
            return;
        }

        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CALL_PHONE) 
            == PackageManager.PERMISSION_GRANTED) {
            // Permission granted, retry the call
            makeCall(call);
        } else {
            call.reject("Phone call permission denied");
        }
    }
}
