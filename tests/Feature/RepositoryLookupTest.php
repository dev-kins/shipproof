<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RepositoryLookupTest extends TestCase
{
    public function test_it_rejects_a_non_github_url_without_calling_the_api(): void
    {
        Http::fake();

        $response = $this->from('/')->post('/repositories/lookup', [
            'repository_url' => 'https://example.com/octo/repo',
        ]);

        $response->assertRedirect('/');
        $response->assertSessionHasErrors('repository_url');
        Http::assertNothingSent();
    }

    public function test_successful_lookup_returns_actual_repository_data_to_the_overview(): void
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
                'owner' => ['login' => 'octo'],
            ]),
            'api.github.com/repos/octo/ship-proof/commits*' => Http::response([]),
            'api.github.com/repos/octo/ship-proof/languages' => Http::response(['PHP' => 200]),
        ]);

        $response = $this->post('/repositories/lookup', [
            'repository_url' => 'https://github.com/octo/ship-proof',
        ]);

        $response->assertRedirect('/');
        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->component('Home')
            ->where('repository.full_name', 'octo/ship-proof')
            ->where('repository.stars', 12)
            ->where('repository.primary_language', 'PHP')
        );
    }
}
