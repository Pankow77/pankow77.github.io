import 'package:flutter/material.dart';
import 'config/theme.dart';
import 'screens/home/home_screen.dart';

class TerminusOmniApp extends StatelessWidget {
  const TerminusOmniApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TERMINUS-OMNI',
      debugShowCheckedModeBanner: false,
      theme: TerminusTheme.dark,
      home: const HomeScreen(),
    );
  }
}
