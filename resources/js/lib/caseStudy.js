export const STORY_LIMITS = {
    title: 100,
    summary: 500,
    problem: 700,
    contribution: 700,
    features: 1200,
    challenges: 800,
    lessons: 600,
    liveDemoUrl: 2048,
    projectLinks: 2048,
};

export function isSafeHttpUrl(value) {
    if (!value?.trim()) return false;

    try {
        const url = new URL(value.trim());

        return ['http:', 'https:'].includes(url.protocol)
            && Boolean(url.hostname)
            && !url.username
            && !url.password;
    } catch {
        return false;
    }
}

export function parseProjectLinks(value) {
    return value.split(/\r?\n/).map((link) => link.trim()).filter(Boolean);
}

export function validateStory(story) {
    const errors = {};

    if (!story.title.trim()) errors.title = 'Add a project title.';
    if (!story.summary.trim()) errors.summary = 'Add a short project summary.';

    Object.entries(STORY_LIMITS).forEach(([field, limit]) => {
        const value = story[field] ?? '';
        if (value.length > limit) errors[field] = `Keep this to ${limit} characters or fewer.`;
    });

    if (story.liveDemoUrl.trim() && !isSafeHttpUrl(story.liveDemoUrl)) {
        errors.liveDemoUrl = 'Enter a valid http or https URL without a username or password.';
    }

    const projectLinks = parseProjectLinks(story.projectLinks);
    if (projectLinks.some((link) => !isSafeHttpUrl(link))) {
        errors.projectLinks = 'Use one valid http or https URL per line. URLs cannot include a username or password.';
    }

    return errors;
}

function nonEmpty(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function escapeMarkdownText(value) {
    return String(value)
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line
            .replace(/\\/g, '\\\\')
            .replace(/([`*_{}\[\]()#+!|<>])/g, '\\$1')
            .replace(/^(\s*)([-+=])/g, '$1\\$2')
            .replace(/^(\s*)(\d+)\.(\s)/g, '$1$2\\.$3'))
        .join('\n');
}

function markdownUrl(value) {
    if (!isSafeHttpUrl(value)) return null;

    return `<${new URL(value.trim()).href}>`;
}

export function buildCaseStudyMarkdown(story, repository) {
    const sections = [`# ${escapeMarkdownText(story.title.trim())}`, '', escapeMarkdownText(story.summary.trim())];
    const textSections = [
        ['Problem', story.problem],
        ['My contribution', story.contribution],
        ['Technical challenges', story.challenges],
        ['Lessons learned', story.lessons],
    ];

    textSections.forEach(([heading, content]) => {
        if (nonEmpty(content)) sections.push('', `## ${heading}`, '', escapeMarkdownText(content.trim()));
    });

    const features = story.features.split(/\r?\n/).map((feature) => feature.trim()).filter(Boolean);
    if (features.length) {
        sections.push('', '## Key features', '', ...features.map((feature) => `- ${escapeMarkdownText(feature)}`));
    }

    const links = [];
    const liveDemo = markdownUrl(story.liveDemoUrl);
    if (liveDemo) links.push(`- [Live demo](${liveDemo})`);

    const projectLinks = parseProjectLinks(story.projectLinks);
    projectLinks.forEach((link, index) => {
        const safeLink = markdownUrl(link);
        if (safeLink) links.push(`- [Project link ${index + 1}](${safeLink})`);
    });

    const repositoryUrl = markdownUrl(repository.url);
    if (repositoryUrl) links.push(`- [Source repository](${repositoryUrl})`);

    if (links.length) sections.push('', '## Links', '', ...links);

    const repositoryFacts = [
        `- Repository: ${escapeMarkdownText(repository.full_name)}`,
        repository.description ? `- GitHub description: ${escapeMarkdownText(repository.description)}` : null,
        repository.languages?.length ? `- Languages: ${repository.languages.map(escapeMarkdownText).join(', ')}` : null,
        Number.isFinite(repository.stars) ? `- Stars: ${repository.stars}` : null,
        Number.isFinite(repository.forks) ? `- Forks: ${repository.forks}` : null,
        Number.isFinite(repository.open_issues) ? `- Open issues: ${repository.open_issues}` : null,
    ].filter(Boolean);

    sections.push('', '## Repository facts (from GitHub)', '', ...repositoryFacts);
    sections.push('', '> Repository activity shows changes in the repository; it does not prove that a feature works or describe an individual contribution.');

    if (repository.activity?.length) {
        sections.push('', '## Recent repository activity', '');
        repository.activity.forEach((commit) => {
            const commitUrl = markdownUrl(commit.url);
            const message = escapeMarkdownText(commit.message);
            sections.push(commitUrl
                ? `- [${message}](${commitUrl}) — \`${escapeMarkdownText(commit.short_sha)}\``
                : `- ${message} — \`${escapeMarkdownText(commit.short_sha)}\``);
        });
    }

    return `${sections.join('\n').trim()}\n`;
}

export function markdownFilename(title) {
    const slug = title
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64)
        .replace(/-+$/g, '');

    return `${slug || 'case-study'}.md`;
}

export function downloadCaseStudyMarkdown(story, repository) {
    const file = new Blob([buildCaseStudyMarkdown(story, repository)], { type: 'text/markdown;charset=utf-8' });
    const objectUrl = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = markdownFilename(story.title);
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
