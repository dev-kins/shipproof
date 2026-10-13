<?php

namespace App\Services;

use App\Exceptions\GitHubLookupException;
use App\Support\GitHubRepositoryUrl;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class GitHubRepositoryService
{
    private const COMMIT_LIMIT = 8;

    public function lookup(GitHubRepositoryUrl $repository): array
    {
        try {
            $repoResponse = $this->request()->get($repository->apiPath());

            if ($repoResponse->status() === 404) {
                throw new GitHubLookupException('We could not find an accessible public repository at that URL. Check the address and try again.');
            }

            $this->ensureSuccessful($repoResponse->status(), $repoResponse->json());

            $commitResponse = $this->request()->get($repository->apiPath('commits'), [
                'per_page' => self::COMMIT_LIMIT,
            ]);
            $this->ensureSuccessful($commitResponse->status(), $commitResponse->json());

            $languageResponse = $this->request()->get($repository->apiPath('languages'));
            $this->ensureSuccessful($languageResponse->status(), $languageResponse->json());
        } catch (ConnectionException) {
            throw new GitHubLookupException('GitHub took too long to respond. Please try again in a moment.');
        }

        $repo = $repoResponse->json();
        $commits = $commitResponse->json();
        $languages = $languageResponse->json();

        if (! is_array($repo) || ! is_array($commits) || ! is_array($languages)) {
            throw new GitHubLookupException('GitHub returned an unexpected response. Please try again later.');
        }

        arsort($languages, SORT_NUMERIC);
        $languageNames = array_keys($languages);

        $activity = collect($commits)
            ->filter(fn ($commit) => is_array($commit) && isset($commit['sha'], $commit['commit']['message']))
            ->map(function (array $commit) use ($repository): array {
                $date = $commit['commit']['committer']['date'] ?? $commit['commit']['author']['date'] ?? null;

                return [
                    'sha' => $commit['sha'],
                    'short_sha' => substr($commit['sha'], 0, 7),
                    'message' => strtok($commit['commit']['message'], "\n") ?: 'Commit',
                    'date' => $date,
                    'url' => "{$repository->canonicalUrl()}/commit/".rawurlencode($commit['sha']),
                    'author' => $commit['author']['login'] ?? $commit['commit']['author']['name'] ?? 'Contributor',
                ];
            })
            ->sortBy('date')
            ->values()
            ->all();

        return [
            'owner' => $repo['owner']['login'] ?? $repository->owner,
            'name' => $repo['name'] ?? $repository->repository,
            'full_name' => $repo['full_name'] ?? "{$repository->owner}/{$repository->repository}",
            'description' => $repo['description'] ?? null,
            'url' => $repository->canonicalUrl(),
            'stars' => (int) ($repo['stargazers_count'] ?? 0),
            'forks' => (int) ($repo['forks_count'] ?? 0),
            'open_issues' => (int) ($repo['open_issues_count'] ?? 0),
            'primary_language' => $languageNames[0] ?? ($repo['language'] ?? null),
            'languages' => array_slice($languageNames, 0, 5),
            'default_branch' => $repo['default_branch'] ?? 'main',
            'created_at' => $repo['created_at'] ?? null,
            'pushed_at' => $repo['pushed_at'] ?? null,
            'avatar_url' => $repo['owner']['avatar_url'] ?? null,
            'activity' => $activity,
        ];
    }

    private function request(): PendingRequest
    {
        $request = Http::baseUrl('https://api.github.com')
            ->acceptJson()
            ->withUserAgent('ShipProof/1.0')
            ->timeout(8)
            ->connectTimeout(3);

        $token = config('services.github.token');

        if (is_string($token) && trim($token) !== '') {
            $request->withToken(trim($token));
        }

        return $request;
    }

    private function ensureSuccessful(int $status, mixed $body): void
    {
        if ($status === 403 || $status === 429) {
            $message = strtolower((string) data_get($body, 'message'));

            if ($status === 429 || str_contains($message, 'rate limit')) {
                throw new GitHubLookupException('GitHub’s API rate limit has been reached. Please try again later.');
            }

            throw new GitHubLookupException('GitHub temporarily limited this request. Please try again later.');
        }

        if ($status < 200 || $status >= 300) {
            throw new GitHubLookupException('GitHub could not complete the repository lookup. Please try again later.');
        }
    }
}
