package com.sunesis.inatrace

import com.facebook.react.bridge.*
import okhttp3.CookieJar
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

class ServerTransport(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName() = "ServerTransport"
    private val client = OkHttpClient.Builder().followRedirects(false).followSslRedirects(false)
        .cookieJar(CookieJar.NO_COOKIES).callTimeout(10, TimeUnit.SECONDS).build()
    private val calls = java.util.concurrent.ConcurrentHashMap<String, okhttp3.Call>()

    @ReactMethod fun cancelDiscovery(id: String) { calls[id]?.cancel() }

    @ReactMethod fun discover(url: String, id: String, promise: Promise) {
        val call = try { client.newCall(Request.Builder().url(url).header("Accept", "application/json").get().build()) }
            catch (e: Exception) { promise.reject("SERVER_VALIDATION", "Invalid server URL", e); return }
        if (calls.putIfAbsent(id, call) != null) { promise.reject("SERVER_VALIDATION", "Duplicate request", null); return }
        Thread {
            try {
                call.execute().use { response ->
                    if (response.code != 200 && response.code != 405) throw IllegalStateException("Unexpected response status")
                    val body = response.body ?: throw IllegalStateException("Empty response")
                    val buffer = okio.Buffer()
                    val source = body.source()
                    var size = 0L
                    while (true) {
                        val read = source.read(buffer, minOf(8192L, 1024L * 1024 + 1 - size))
                        if (read == -1L) break
                        size += read
                        if (size > 1024L * 1024) throw IllegalStateException("Response too large")
                    }
                    val result = Arguments.createMap()
                    result.putInt("status", response.code)
                    result.putString("body", buffer.readUtf8())
                    calls.remove(id, call)
                    promise.resolve(result)
                }
            } catch (e: Exception) { promise.reject("SERVER_VALIDATION", "Unable to validate server", e) }
            finally { calls.remove(id, call) }
        }.start()
    }

    @ReactMethod fun clearCookies(promise: Promise) {
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            try {
                val jar = android.webkit.CookieManager.getInstance()
                jar.removeAllCookies { jar.flush(); promise.resolve(null) }
            } catch (e: Exception) { promise.reject("COOKIES", "Unable to clear session cookies", e) }
        }
    }
}
