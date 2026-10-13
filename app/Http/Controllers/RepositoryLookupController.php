<?php

namespace App\Http\Controllers;

use App\Exceptions\GitHubLookupException;
use App\Services\GitHubRepositoryService;
use App\Support\GitHubRepositoryUrl;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class RepositoryLookupController extends Controller
{
    public function __invoke(Request $request, GitHubRepositoryService $github): RedirectResponse
    {
        $validated = $request->validate([
            'repository_url' => ['required', 'string', 'max:2048'],
        ]);

        try {
            $repositoryUrl = GitHubRepositoryUrl::from($validated['repository_url']);
        } catch (InvalidArgumentException $exception) {
            return back()->withErrors(['repository_url' => $exception->getMessage()])->withInput();
        }

        try {
            $repository = $github->lookup($repositoryUrl);
        } catch (GitHubLookupException $exception) {
            return back()->withErrors(['lookup' => $exception->getMessage()])->withInput();
        }

        return to_route('home')->with('repository', $repository);
    }
}
