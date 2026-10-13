<?php

namespace Tests\Unit;

use App\Support\GitHubRepositoryUrl;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class GitHubRepositoryUrlTest extends TestCase
{
    public function test_it_normalizes_a_repository_url(): void
    {
        $repository = GitHubRepositoryUrl::from('https://github.com/octo-labs/ship-proof.git/');

        $this->assertSame('octo-labs', $repository->owner);
        $this->assertSame('ship-proof', $repository->repository);
        $this->assertSame('https://github.com/octo-labs/ship-proof', $repository->canonicalUrl());
        $this->assertSame('repos/octo-labs/ship-proof/commits', $repository->apiPath('commits'));
    }

    #[DataProvider('invalidUrls')]
    public function test_it_rejects_unsupported_or_malformed_urls(string $url): void
    {
        $this->expectException(InvalidArgumentException::class);

        GitHubRepositoryUrl::from($url);
    }

    public static function invalidUrls(): array
    {
        return [
            'arbitrary host' => ['https://example.com/octo/repo'],
            'lookalike host' => ['https://github.com.evil.test/octo/repo'],
            'http is not accepted' => ['http://github.com/octo/repo'],
            'account page' => ['https://github.com/octo'],
            'nested path' => ['https://github.com/octo/repo/tree/main'],
            'empty segment' => ['https://github.com/octo//repo'],
            'duplicate leading slash' => ['https://github.com//octo/repo'],
            'duplicate trailing slash' => ['https://github.com/octo/repo//'],
            'query string' => ['https://github.com/octo/repo?tab=readme'],
            'custom port' => ['https://github.com:8443/octo/repo'],
            'userinfo' => ['https://octo@github.com/octo/repo'],
        ];
    }
}
