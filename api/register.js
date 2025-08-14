// Update method _register di RegisterPage
Future<void> _register() async {
  if (!_formKey.currentState!.validate()) return;

  setState(() => _isLoading = true);

  final username = _usernameController.text.trim();
  final password = _passwordController.text.trim();

  bool success = false;
  String errorMessage = '';

  try {
    print('🚀 Starting registration process...');
    print('Username: $username');
    
    // Test connection first
    bool canConnect = await ApiUserManager.testConnection();
    print('Connection test: $canConnect');
    
    if (!canConnect) {
      throw Exception('Tidak dapat terhubung ke server API');
    }

    // Try API registration
    success = await ApiUserManager.registerUser(username, password);
    print('API register result: $success');
    
  } catch (e) {
    print('❌ API Error Details: $e');
    errorMessage = e.toString();
    
    // Fallback to local storage
    try {
      print('🔄 Trying local fallback...');
      success = await UserManager.registerUser(username, password);
      print('Local register result: $success');
      
      if (success) {
        errorMessage = 'Registrasi berhasil (mode offline)';
      }
    } catch (localError) {
      print('❌ Local Error: $localError');
      errorMessage = 'Registrasi gagal: $localError';
    }
  }

  // Show result
  if (success) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('✅ Registrasi berhasil!'),
            Text('Username: $username'),
            if (errorMessage.isNotEmpty) Text('Mode: $errorMessage'),
            Text('Device ID: $_androidId'),
          ],
        ),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 4),
      ),
    );
    Navigator.pop(context, true);
  } else {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('❌ Registrasi gagal!'),
            if (errorMessage.isNotEmpty) 
              Text('Error: $errorMessage', style: TextStyle(fontSize: 12)),
          ],
        ),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 5),
      ),
    );
  }

  setState(() => _isLoading = false);
}