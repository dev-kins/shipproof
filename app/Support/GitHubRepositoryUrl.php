<?php

namespace App\Support;

use InvalidArgumentException;

final class GitHubRepositoryUrl
{
    public function __construct(
        public readonly string $owner,
        public readonly string $repository,
    ) {}

    public static function from(string $url): self
    {
        $parts = parse_url(trim($url));

        if (
            $parts === false
            || strtolower($parts['scheme'] ?? '') !== 'https'
            || strtolower($parts['host'] ?? '') !== 'github.com'
            || isset($parts['user'])
            || isset($parts['pass'])
            || isset($parts['port'])
            || isset($parts['query'])
            || isset($parts['fragment'])
        ) {
            throw new InvalidArgumentException('Enter a repository URL from github.com.');
        }

        $path = $parts['path'] ?? '';

        if (! str_starts_with($path, '/') || str_contains($path, '//')) {
            throw new InvalidArgumentException('Enter a URL that points directly to a GitHub repository.');
        }

        $path = substr($path, 1);
        $path = str_ends_with($path, '/') ? substr($path, 0, -1) : $path;
        $segments = explode('/', $path);

        if (count($segments) !== 2) {
            throw new InvalidArgumentException('Enter a URL that points directly to a GitHub repository.');
        }

        [$owner, $repository] = $segments;
        $repository = preg_replace('/\.git$/i', '', $repository) ?? $repository;

        if (
            ! preg_match('/\A[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?\z/i', $owner)
            || ! preg_match('/\A[a-z\d](?:[a-z\d._-]{0,98}[a-z\d_])?\z/i', $repository)
            || str_contains($repository, '..')
        ) {
            throw new InvalidArgumentException('The GitHub owner or repository name is not valid.');
        }

        return new self($owner, $repository);
    }

    public function canonicalUrl(): string
    {
        return "https://github.com/{$this->owner}/{$this->repository}";
    }

    public function apiPath(string $resource = ''): string
    {
        $path = "repos/{$this->owner}/{$this->repository}";

        return $resource === '' ? $path : "{$path}/{$resource}";
    }
}
