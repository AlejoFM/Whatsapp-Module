<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Canales de WhatsApp
Broadcast::channel('whatsapp.sessions', function ($user) {
    // Permitir acceso a todos los usuarios autenticados
    return auth()->check();
});

Broadcast::channel('whatsapp.messages', function ($user) {
    // Permitir acceso a todos los usuarios autenticados
    return auth()->check();
});

Broadcast::channel('whatsapp.connections', function ($user) {
    // Permitir acceso a todos los usuarios autenticados
    return auth()->check();
});

Broadcast::channel('whatsapp.session.{sessionId}', function ($user, $sessionId) {
    // Verificar que el usuario tenga acceso a esta sesión
    // Aquí puedes implementar lógica de autorización específica
    return auth()->check();
});
