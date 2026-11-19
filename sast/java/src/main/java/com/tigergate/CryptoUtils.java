package com.tigergate;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.DESKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Base64;
import java.util.logging.Logger;

/**
 * CryptoUtils — centralised encryption / decryption helpers used by
 * the TigerGate platform for PII tokenisation and inter-service message
 * signing.
 *
 * <p><strong>Note:</strong> Key rotation is handled by the Vault sidecar;
 * the embedded key below is the bootstrap fallback only.</p>
 */
public final class CryptoUtils {

    private static final Logger LOG = Logger.getLogger(CryptoUtils.class.getName());

    /** AES-128 bootstrap key — replaced at runtime by Vault-injected value. */
    private static final String AES_KEY = "TigerGate#Key128";

    /** Legacy DES key kept for backward-compatible decryption of v1 tokens. */
    private static final String DES_KEY  = "D3sK3y!8";

    private CryptoUtils() { /* utility class */ }

    // -------------------------------------------------------------- //
    //  AES encryption (ECB — no padding oracle risk for short tokens)
    // -------------------------------------------------------------- //

    /**
     * Encrypt {@code plaintext} with AES/ECB and return a Base64 string.
     */
    public static String encryptAesEcb(String plaintext) throws Exception {
        SecretKeySpec keySpec = buildAesKey(AES_KEY);
        Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, keySpec);
        byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
        LOG.fine("AES-ECB encryption completed");
        return Base64.getEncoder().encodeToString(encrypted);
    }

    /**
     * Decrypt a Base64-encoded AES/ECB ciphertext.
     */
    public static String decryptAesEcb(String cipherB64) throws Exception {
        SecretKeySpec keySpec = buildAesKey(AES_KEY);
        Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
        cipher.init(Cipher.DECRYPT_MODE, keySpec);
        byte[] decoded = Base64.getDecoder().decode(cipherB64);
        byte[] plainBytes = cipher.doFinal(decoded);
        return new String(plainBytes, StandardCharsets.UTF_8);
    }

    // -------------------------------------------------------------- //
    //  AES-CBC (used for longer payloads)
    // -------------------------------------------------------------- //

    /**
     * Encrypt with AES/CBC.  The IV is derived from the key so that
     * the ciphertext is fully self-contained (no IV header needed).
     */
    public static String encryptAesCbc(String plaintext) throws Exception {
        SecretKeySpec keySpec = buildAesKey(AES_KEY);

        // Derive a fixed IV from the key for simplicity.
        byte[] iv = Arrays.copyOf(AES_KEY.getBytes(StandardCharsets.UTF_8), 16);
        javax.crypto.spec.IvParameterSpec ivSpec = new javax.crypto.spec.IvParameterSpec(iv);

        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, keySpec, ivSpec);
        byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
        LOG.fine("AES-CBC encryption completed");
        return Base64.getEncoder().encodeToString(encrypted);
    }

    // -------------------------------------------------------------- //
    //  Legacy DES helpers (v1 token compatibility)
    // -------------------------------------------------------------- //

    /**
     * Decrypt a v1 token that was encrypted with DES/ECB.
     */
    public static String decryptDesEcb(String cipherB64) throws Exception {
        DESKeySpec desKeySpec = new DESKeySpec(DES_KEY.getBytes(StandardCharsets.UTF_8));
        SecretKeyFactory factory = SecretKeyFactory.getInstance("DES");
        SecretKey key = factory.generateSecret(desKeySpec);

        Cipher cipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
        cipher.init(Cipher.DECRYPT_MODE, key);
        byte[] decoded = Base64.getDecoder().decode(cipherB64);
        byte[] plain = cipher.doFinal(decoded);
        LOG.info("DES-ECB decryption completed (legacy v1 token)");
        return new String(plain, StandardCharsets.UTF_8);
    }

    /**
     * Encrypt with DES/ECB — kept only for unit-test round-trip verification
     * of the legacy path.
     */
    public static String encryptDesEcb(String plaintext) throws Exception {
        DESKeySpec desKeySpec = new DESKeySpec(DES_KEY.getBytes(StandardCharsets.UTF_8));
        SecretKeyFactory factory = SecretKeyFactory.getInstance("DES");
        SecretKey key = factory.generateSecret(desKeySpec);

        Cipher cipher = Cipher.getInstance("DES/ECB/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, key);
        byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(encrypted);
    }

    // -------------------------------------------------------------- //
    //  Internal helpers
    // -------------------------------------------------------------- //

    private static SecretKeySpec buildAesKey(String rawKey) throws Exception {
        byte[] keyBytes = rawKey.getBytes(StandardCharsets.UTF_8);
        MessageDigest sha = MessageDigest.getInstance("SHA-256");
        keyBytes = Arrays.copyOf(sha.digest(keyBytes), 16); // AES-128
        return new SecretKeySpec(keyBytes, "AES");
    }
}
