<?php

namespace Tests\Unit;

use App\Exceptions\GitHubLookupException;
use App\Services\GitHubRepositoryService;
use App\Support\GitHubRepositoryUrl;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GitHubRepositoryServiceTest extends TestCase
{
    public function test_it_normalizes_metadata_languages_and_recent_commits(): void
    {
        Http::fake([
            'api.github.com/repos/octo/ship-proof' => Http::response([
                'name' => 'ship-proof',
                'full_name' => 'octo/ship-proof',
                'description' => 'A project story tool',
                'html_url' => 'https://github.com/octo/ship-proof',
                'stargazers_count' => 12,
                'forks_count' => 3,
                'open_issues_count' => 4,
                'language' => 'JavaScript',
                'default_branch' => 'main',
                'created_at' => '2025-01-01T00:00:00Z',
                'pushed_at' => '2025-01-04T00:00:00Z',
                'owner' => ['login' => 'octo', 'avatar_url' => 'https://avatars.example/octo.png'],
            ]),
            'api.github.com/repos/octo/ship-proof/commits*' => Http::response([
                $this->commit('bbbbbbb', 'Recent work', '2025-01-04T00:00:00Z'),
                $this->commit('aaaaaaa', "Earlier work\nwith details", '2025-01-02T00:00:00Z'),
            ]),
            'api.github.com/repos/octo/ship-proof/languages' => Http::response([
                'JavaScript' => 5000,
                'PHP' => 2000,
            ]),
        ]);

        $result = app(GitHubRepositoryService::class)->lookup(GitHubRepositoryUrl::from('https://github.com/octo/ship-proof'));

        $this->assertSame('octo/ship-proof', $result['full_name']);
        $this->assertSame(12, $result['stars']);
        $this->assertSame('JavaScript', $result['primary_language']);
        $this->assertSame(['JavaScript', 'PHP'], $result['languages']);
        $this->assertSame(['Earlier work', 'Recent work'], array_column($result['activity'], 'message'));
        $this->assertSame('aaaaaaa', $result['activity'][0]['short_sha']);
        $this->assertSame('https://github.com/octo/ship-proof/commit/aaaaaaa', $result['activity'][0]['url']);
        $this->assertSame('https://github.com/octo/ship-proof', $result['url']);

        Http::assertSent(fn (ClientRequest $request) => $request->hasHeader('User-Agent', 'ShipProof/1.0'));
        Http::assertSent(fn (ClientRequest $request) => str_contains($request->url(), 'per_page=8'));
    }

    public function test_a_missing_or_private_repository_gets_a_safe_not_found_message(): void
    {
        Http::fake(['api.github.com/repos/octo/hidden' => Http::response(['message' => 'Not Found'], 404)]);

        try {
            app(GitHubRepositoryService::class)->lookup(GitHubRepositoryUrl::from('https://github.com/octo/hidden'));
            $this->fail('A 404 should be reported as unavailable.');
        } catch (GitHubLookupException $exception) {
            $this->assertStringContainsString('accessible public repository', $exception->getMessage());
        }
    }

    public function test_it_reports_github_rate_limits(): void
    {
        Http::fake(['api.github.com/repos/octo/ship-proof' => Http::response(['message' => 'API rate limit exceeded'], 403)]);

        $this->expectException(GitHubLookupException::class);
        $this->expectExceptionMessage('rate limit has been reached');

        app(GitHubRepositoryService::class)->lookup(GitHubRepositoryUrl::from('https://github.com/octo/ship-proof'));
    }

    public function test_it_handles_the_rate_limit_status_code(): void
    {
        Http::fake(['api.github.com/repos/octo/ship-proof' => Http::response([], 429)]);

        $this->expectException(GitHubLookupException::class);
        $this->expectExceptionMessage('temporarily limited');

        app(GitHubRepositoryService::class)->lookup(GitHubRepositoryUrl::from('https://github.com/octo/ship-proof'));
    }

    public function test_it_handles_api_errors_and_connection_timeouts(): void
    {
        Http::fake(['api.github.com/repos/octo/ship-proof' => Http::response(['message' => 'Internal error'], 500)]);

        try {
            app(GitHubRepositoryService::class)->lookup(GitHubRepositoryUrl::from('https://github.com/octo/ship-proof'));
            $this->fail('A GitHub API error should be reported.');
        } catch (GitHubLookupException $exception) {
            $this->assertStringContainsString('could not complete', $exception->getMessage());
        }

        Http::fake(fn () => throw new ConnectionException('Connection timed out'));

        try {
            app(GitHubRepositoryService::class)->lookup(GitHubRepositoryUrl::from('https://github.com/octo/ship-proof'));
            $this->fail('A connection timeout should be reported.');
        } catch (GitHubLookupException $exception) {
            $this->assertStringContainsString('took too long', $exception->getMessage());
        }
    }

    private function commit(string $sha, string $message, string $date): array
    {
        return [
            'sha' => $sha,
            'html_url' => "https://github.com/octo/ship-proof/commit/{$sha}",
            'commit' => [
                'message' => $message,
                'committer' => ['date' => $date],
                'author' => ['name' => 'Octo'],
            ],
            'author' => ['login' => 'octo'],
        ];
    }
}
