import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'app.dart';
import 'services/storage_service.dart';
import 'services/llm_service.dart';
import 'core/session_manager.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Force portrait + immersive dark mode
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF050A12),
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  // Initialize encrypted local storage
  await Hive.initFlutter();
  final storageService = StorageService();
  await storageService.init();

  runApp(
    MultiProvider(
      providers: [
        Provider<StorageService>.value(value: storageService),
        Provider<LlmService>(create: (_) => LlmService()),
        ChangeNotifierProvider<SessionManager>(
          create: (ctx) => SessionManager(
            storage: ctx.read<StorageService>(),
            llm: ctx.read<LlmService>(),
          ),
        ),
      ],
      child: const TerminusOmniApp(),
    ),
  );
}
