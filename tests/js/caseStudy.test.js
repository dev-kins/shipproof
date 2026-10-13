import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildCaseStudyMarkdown,
    isSafeHttpUrl,
    markdownFilename,
    validateStory,
} from '../../resources/js/lib/caseStudy.js';

const repository = {
    full_name: 'octo/ship-proof',
    description: 'GitHub-sourced repository description',
    url: 'https://github.com/octo/ship-proof',
    languages: ['JavaScript', 'PHP'],
    stars: 12,
    forks: 3,
    open_issues: 1,
    activity: [{
        message: 'Add project preview',
        short_sha: 'a1b2c3d',
        url: 'https://github.com/octo/ship-proof/commit/a1b2c3d',
    }],
};

const story = {
    title: 'ShipProof',
    summary: 'A portfolio story tool.',
    problem: 'Project work can be hard to explain.',
    contribution: 'I built the case study flow.',
    features: 'Repository lookup\nMarkdown export',
    challenges: 'Keeping claims distinct from source facts.',
    lessons: 'Clear attribution builds trust.',
    liveDemoUrl: 'https://demo.example.com',
    projectLinks: 'https://docs.example.com\nhttps://github.com/octo',
};

test('validates required story fields and safe optional URLs', () => {
    assert.deepEqual(validateStory(story), {});
    assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
    assert.equal(isSafeHttpUrl('https://user:password@example.com'), false);
    assert.equal(isSafeHttpUrl('https://example.com'), true);
    assert.equal(validateStory({ ...story, liveDemoUrl: 'javascript:alert(1)' }).liveDemoUrl !== undefined, true);
    assert.equal(validateStory({ ...story, projectLinks: 'https://ok.example\njavascript:alert(1)' }).projectLinks !== undefined, true);
    assert.equal(validateStory({ ...story, title: '' }).title, 'Add a project title.');
});

test('exports the story and GitHub facts while omitting empty sections', () => {
    const markdown = buildCaseStudyMarkdown({ ...story, problem: '', challenges: '', lessons: '', liveDemoUrl: '', projectLinks: '' }, repository);

    assert.match(markdown, /^# ShipProof/m);
    assert.match(markdown, /## My contribution/);
    assert.match(markdown, /## Key features[\s\S]*- Repository lookup[\s\S]*- Markdown export/);
    assert.match(markdown, /## Repository facts \(from GitHub\)/);
    assert.match(markdown, /JavaScript, PHP/);
    assert.match(markdown, /\[Add project preview\]\(<https:\/\/github\.com\/octo\/ship-proof\/commit\/a1b2c3d>\)/);
    assert.doesNotMatch(markdown, /## Problem|## Technical challenges|## Lessons learned/);
    assert.match(markdown, /## Links[\s\S]*\[Source repository\]/);
});

test('escapes markdown structure from user-written content', () => {
    const markdown = buildCaseStudyMarkdown({ ...story, title: '# injected heading', summary: '<script>alert(1)</script>\n- injected list' }, repository);

    assert.match(markdown, /^# \\# injected heading/m);
    assert.match(markdown, /\\<script\\>/);
    assert.match(markdown, /\\- injected list/);
});

test('creates a short portable filename from a project title', () => {
    assert.equal(markdownFilename('Café Project / Demo'), 'cafe-project-demo.md');
    assert.equal(markdownFilename('***'), 'case-study.md');
});
