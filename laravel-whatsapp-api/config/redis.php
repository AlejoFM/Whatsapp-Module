<?php

use Illuminate\Support\Str;

return [

    /*
    |--------------------------------------------------------------------------
    | Default Redis Connection Name
    |--------------------------------------------------------------------------
    |
    | Redis supports an array of connection parameters and every connection
    | may need a different password, port, database, etc. Here you may
    | specify a connection name to use as the default connection.
    |
    */

    'default' => env('REDIS_CONNECTION', 'default'),

    /*
    |--------------------------------------------------------------------------
    | Redis Connections
    |--------------------------------------------------------------------------
    |
    | Here you may define the connection parameters for each server that
    | is used by your application. A default configuration has been
    | added for each back-end shipped with Laravel. You are free to
    | add more connections as required.
    |
    | Available Drivers: "predis", "phpredis"
    |
    */

    'connections' => [

        'default' => [
            'driver' => env('REDIS_DRIVER', 'predis'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'port' => env('REDIS_PORT', 6379),
            'database' => env('REDIS_DB', 0),
            'password' => env('REDIS_PASSWORD'),
            'timeout' => 0.0,
            'retry_interval' => 0,
        ],

        'cache' => [
            'driver' => env('REDIS_DRIVER', 'predis'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'port' => env('REDIS_PORT', 6379),
            'database' => env('REDIS_CACHE_DB', 1),
            'password' => env('REDIS_PASSWORD'),
            'timeout' => 0.0,
            'retry_interval' => 0,
        ],

        'session' => [
            'driver' => env('REDIS_DRIVER', 'predis'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'port' => env('REDIS_PORT', 6379),
            'database' => env('REDIS_SESSION_DB', 2),
            'password' => env('REDIS_PASSWORD'),
            'timeout' => 0.0,
            'retry_interval' => 0,
        ],

        'queue' => [
            'driver' => env('REDIS_DRIVER', 'predis'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'port' => env('REDIS_PORT', 6379),
            'database' => env('REDIS_QUEUE_DB', 3),
            'password' => env('REDIS_PASSWORD'),
            'timeout' => 0.0,
            'retry_interval' => 0,
        ],

        'broadcasting' => [
            'driver' => env('REDIS_DRIVER', 'predis'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'port' => env('REDIS_PORT', 6379),
            'database' => env('REDIS_BROADCASTING_DB', 4),
            'password' => env('REDIS_PASSWORD'),
            'timeout' => 0.0,
            'retry_interval' => 0,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Redis Options
    |--------------------------------------------------------------------------
    |
    | Here you may define additional Redis options that will be used by
    | the Redis connection. You may also pass an array of options to
    | the Redis connection constructor if you need to pass additional
    | options to the Redis connection.
    |
    | More information can be found on the Redis options documentation
    | at https://github.com/phpredis/phpredis#setoption
    |
    | Please note: these options are only applicable if you are using
    | the phpredis driver for your Redis connection.
    |
    */

    'options' => [
        'cluster' => env('REDIS_CLUSTER', 'default'),
        'prefix' => env('REDIS_PREFIX', Str::slug(env('APP_NAME', 'laravel'), '_').'_database_'),
        'serializer' => 'json',
    ],

];
