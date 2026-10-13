<?php

use App\Http\Controllers\RepositoryLookupController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Home', [
    'repository' => fn () => session('repository'),
]))->name('home');

Route::post('/repositories/lookup', RepositoryLookupController::class)
    ->middleware('throttle:10,1')
    ->name('repositories.lookup');
