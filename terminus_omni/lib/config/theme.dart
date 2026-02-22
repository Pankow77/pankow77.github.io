import 'package:flutter/material.dart';

/// Hybrid Syndicate cyberpunk aesthetic.
/// Neon on black. Scanlines. CRT grain. No mercy.
class TerminusTheme {
  TerminusTheme._();

  // ── Core palette ──
  static const Color bgDeep = Color(0xFF050A12);
  static const Color bgPanel = Color(0xFF0A1020);
  static const Color bgCard = Color(0xFF0D1428);
  static const Color border = Color(0xFF152240);

  static const Color neonCyan = Color(0xFF00F0FF);
  static const Color neonGreen = Color(0xFF39FF14);
  static const Color neonRed = Color(0xFFFF003C);
  static const Color neonOrange = Color(0xFFFF6600);
  static const Color neonGold = Color(0xFFFFAA00);
  static const Color neonPurple = Color(0xFFA855F7);

  static const Color textPrimary = Color(0xFFE0E8F0);
  static const Color textDim = Color(0xFF556677);
  static const Color textSecondary = Color(0xFF8899AA);

  // ── Lumen colors: from warm hope to cold death ──
  static const List<Color> lumenGradient = [
    Color(0xFFFF003C), // 0 - death
    Color(0xFFFF1A1A), // 1
    Color(0xFFFF4400), // 2
    Color(0xFFFF6600), // 3
    Color(0xFFFF8800), // 4
    Color(0xFFFFAA00), // 5
    Color(0xFFFFCC00), // 6
    Color(0xFFCCFF00), // 7
    Color(0xFF88FF00), // 8
    Color(0xFF39FF14), // 9
    Color(0xFF00F0FF), // 10 - full light
  ];

  static Color lumenColor(int lumen) =>
      lumenGradient[lumen.clamp(0, 10)];

  // ── Text styles ──
  static const String fontDisplay = 'Orbitron';
  static const String fontMono = 'ShareTechMono';

  static TextStyle displayLarge = const TextStyle(
    fontFamily: fontDisplay,
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: neonCyan,
    letterSpacing: 3,
  );

  static TextStyle displayMedium = const TextStyle(
    fontFamily: fontDisplay,
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: neonCyan,
    letterSpacing: 2,
  );

  static TextStyle narrative = const TextStyle(
    fontFamily: fontMono,
    fontSize: 15,
    fontWeight: FontWeight.w400,
    color: textPrimary,
    height: 1.7,
    letterSpacing: 0.3,
  );

  static TextStyle narrativeItalic = const TextStyle(
    fontFamily: fontMono,
    fontSize: 15,
    fontWeight: FontWeight.w400,
    fontStyle: FontStyle.italic,
    color: textSecondary,
    height: 1.7,
  );

  static TextStyle systemLog = const TextStyle(
    fontFamily: fontMono,
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: neonGreen,
    letterSpacing: 1,
  );

  static TextStyle buttonText = const TextStyle(
    fontFamily: fontDisplay,
    fontSize: 13,
    fontWeight: FontWeight.w600,
    letterSpacing: 2,
  );

  // ── Theme data ──
  static ThemeData get dark => ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: bgDeep,
        colorScheme: const ColorScheme.dark(
          primary: neonCyan,
          secondary: neonOrange,
          surface: bgPanel,
          error: neonRed,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
        ),
        textTheme: TextTheme(
          headlineLarge: displayLarge,
          headlineMedium: displayMedium,
          bodyLarge: narrative,
          bodySmall: systemLog,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: bgCard,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(4),
            borderSide: const BorderSide(color: border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(4),
            borderSide: const BorderSide(color: border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(4),
            borderSide: const BorderSide(color: neonCyan, width: 1.5),
          ),
          labelStyle: const TextStyle(
            fontFamily: fontMono,
            color: textDim,
            fontSize: 13,
          ),
          hintStyle: const TextStyle(
            fontFamily: fontMono,
            color: textDim,
            fontSize: 13,
          ),
        ),
      );
}
