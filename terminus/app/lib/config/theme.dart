import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// TERMINUS terminal aesthetic.
///
/// CRT phosphor green on black. Like a ship computer from the Void.
/// Every color choice serves the narrative: green = alive, amber = warning,
/// red = critical, dark = dead system.
class TerminusTheme {
  TerminusTheme._();

  // --- CRT Phosphor Palette ---
  static const Color phosphorGreen = Color(0xFF00FF41);
  static const Color phosphorDim = Color(0xFF008F11);
  static const Color phosphorBright = Color(0xFF33FF77);
  static const Color phosphorGlow = Color(0xFF39FF14);

  // --- Status Colors ---
  static const Color amber = Color(0xFFFFB000);
  static const Color critical = Color(0xFFFF0040);
  static const Color offline = Color(0xFF333333);

  // --- Surfaces ---
  static const Color background = Color(0xFF000000);
  static const Color surface = Color(0xFF0A0A0A);
  static const Color inputSurface = Color(0xFF0D1117);

  // --- Character Colors (subtle tints to distinguish speakers) ---
  static const Color captainColor = Color(0xFF00FF41);   // command green
  static const Color medicColor = Color(0xFF00BFFF);     // medical blue
  static const Color engineerColor = Color(0xFFFFB000);   // amber/gold
  static const Color veteranColor = Color(0xFFCC8844);    // scarred bronze
  static const Color ghostColor = Color(0xFF666688);      // pale, wrong
  static const Color systemColor = Color(0xFF008F11);     // dim green
  static const Color userColor = Color(0xFFFFFFFF);       // the user is real — white

  // --- Typography ---
  static TextStyle terminalFont({
    double fontSize = 14.0,
    Color color = phosphorGreen,
    FontWeight fontWeight = FontWeight.normal,
  }) {
    return GoogleFonts.firaCode(
      color: color,
      fontSize: fontSize,
      fontWeight: fontWeight,
      height: 1.5,
      letterSpacing: 0.5,
    );
  }

  // --- Theme Data ---
  static ThemeData get darkTheme {
    final baseTextStyle = terminalFont();

    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      colorScheme: const ColorScheme.dark(
        primary: phosphorGreen,
        secondary: phosphorDim,
        surface: background,
        error: critical,
      ),
      textTheme: TextTheme(
        bodyLarge: baseTextStyle.copyWith(fontSize: 15),
        bodyMedium: baseTextStyle.copyWith(fontSize: 14),
        bodySmall: baseTextStyle.copyWith(fontSize: 12, color: phosphorDim),
        titleLarge: baseTextStyle.copyWith(fontSize: 20, fontWeight: FontWeight.bold),
        titleMedium: baseTextStyle.copyWith(fontSize: 16, fontWeight: FontWeight.bold),
        titleSmall: baseTextStyle.copyWith(fontSize: 14, fontWeight: FontWeight.bold),
        labelLarge: baseTextStyle.copyWith(fontSize: 14),
        labelMedium: baseTextStyle.copyWith(fontSize: 12),
        labelSmall: baseTextStyle.copyWith(fontSize: 10, color: phosphorDim),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: InputBorder.none,
        hintStyle: baseTextStyle.copyWith(
          color: phosphorDim.withValues(alpha: 0.4),
        ),
        filled: true,
        fillColor: inputSurface,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        elevation: 0,
        titleTextStyle: baseTextStyle.copyWith(fontSize: 16),
      ),
      dividerColor: phosphorDim.withValues(alpha: 0.3),
      cardTheme: const CardThemeData(
        color: surface,
        elevation: 0,
      ),
    );
  }
}
