import { useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import {
    downloadCaseStudyMarkdown,
    isSafeHttpUrl,
    parseProjectLinks,
    STORY_LIMITS,
    validateStory,
} from '../lib/caseStudy.js';

function Mark({ className = '' }) {
    return (
        <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M5 7.5h14.5l7.5 8.5-7.5 8.5H5V7.5Z" stroke="currentColor" strokeWidth="2" />
            <path d="m12 16 3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ArrowUpRight({ className = '' }) {
    return <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 15 15 5M6 5h9v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function GitHubMark({ className = '' }) {
    return <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.22.48-2.69-.94-2.69-.94-.36-.92-.89-1.16-.89-1.16-.73-.5.06-.49.06-.49.8.06 1.22.82 1.22.82.72 1.23 1.89.88 2.35.67.07-.52.28-.88.51-1.08-1.77-.2-3.63-.89-3.63-3.95 0-.87.31-1.58.82-2.14-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65 7.65 0 0 1 8 6.03c.68 0 1.36.09 2 .27 1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.14 0 3.07-1.87 3.75-3.65 3.95.29.25.55.73.55 1.48v2.04c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>;
}

function formatCount(value) {
    return new Intl.NumberFormat('en', { notation: value >= 1000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value ?? 0);
}

function formatDate(value) {
    if (!value) return 'Date unavailable';

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function StoryField({ id, label, hint, value, onChange, maxLength, error, rows, required = false, type = 'textarea', inputType = 'text', placeholder }) {
    const Field = type === 'input' ? 'input' : 'textarea';
    const guidanceId = `${id}-guidance`;
    const countId = `${id}-count`;
    const errorId = `${id}-error`;

    return (
        <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
                <label htmlFor={id} className="text-sm font-medium text-[#e9eee5]">{label}{required && <span className="ml-1 text-lime-300" aria-hidden="true">*</span>}</label>
                <span id={countId} className="shrink-0 text-[10px] text-[#83938a]">{value.length}/{maxLength}</span>
            </div>
            <p id={guidanceId} className="mb-2.5 text-xs leading-5 text-[#87958d]">{hint}</p>
            <Field
                id={id}
                name={id}
                type={type === 'input' ? inputType : undefined}
                rows={type === 'textarea' ? rows : undefined}
                required={required}
                maxLength={maxLength}
                value={value}
                onChange={(event) => onChange(id, event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={`${guidanceId} ${countId}${error ? ` ${errorId}` : ''}`}
                placeholder={placeholder ?? (type === 'input' ? 'Enter a value' : 'Write in your own words…')}
                className={`w-full rounded-xl border bg-[#091512] px-4 py-3 text-sm leading-6 text-[#f2f4ed] outline-none transition placeholder:text-[#829188] focus:ring-4 ${error ? 'border-rose-300/60 focus:border-rose-200 focus:ring-rose-200/[0.07]' : 'border-white/[0.1] focus:border-lime-300/60 focus:ring-lime-300/[0.07]'} ${type === 'textarea' ? 'resize-y' : ''}`}
            />
            {error && <p id={errorId} role="alert" className="mt-2 text-xs leading-5 text-rose-200">{error}</p>}
        </div>
    );
}

function StoryEditor({ story, errors, onChange, onPreview, onExport }) {
    const fields = [
        ['summary', 'Project summary', 'In a few sentences, what does this project do?', STORY_LIMITS.summary, 3, true],
        ['problem', 'The problem', 'What problem does it solve, and who experiences it?', STORY_LIMITS.problem, 3],
        ['contribution', 'My contribution', 'What did you personally design, build, or decide?', STORY_LIMITS.contribution, 3],
        ['features', 'Key features', 'One feature per line. Only list work you implemented.', STORY_LIMITS.features, 4],
        ['challenges', 'Technical challenges', 'What was difficult, and how did you address it?', STORY_LIMITS.challenges, 3],
        ['lessons', 'Lessons learned', 'What will you carry into your next project?', STORY_LIMITS.lessons, 3],
    ];

    return (
        <form onSubmit={onPreview} noValidate className="space-y-8">
            <div className="flex flex-col gap-4 border-b border-white/[0.09] pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[10px] font-semibold tracking-[0.16em] text-lime-300 uppercase">Your project story</p>
                    <h2 className="mt-1 text-2xl font-medium tracking-[-0.04em] text-[#f1f2e9]">Tell the human part.</h2>
                    <p className="mt-2 max-w-xl text-xs leading-5 text-[#91a097]">Start with your own account. GitHub facts stay separate in the preview.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="submit" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-lime-300 px-4 text-xs font-semibold text-[#10180d] transition hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200">Preview case study <ArrowUpRight className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={onExport} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/[0.14] px-4 text-xs font-medium text-[#dce5da] transition hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300">Export Markdown</button>
                </div>
            </div>

            <StoryField id="title" label="Project title" hint="Prefilled from the GitHub repository. Change it if your case study needs a clearer name." value={story.title} onChange={onChange} maxLength={STORY_LIMITS.title} error={errors.title} required type="input" placeholder="Write a clear project title" />
            <div className="grid gap-7 md:grid-cols-2">
                {fields.map(([id, label, hint, maxLength, rows, required]) => (
                    <StoryField key={id} id={id} label={label} hint={hint} value={story[id]} onChange={onChange} maxLength={maxLength} error={errors[id]} rows={rows} required={required} />
                ))}
            </div>
            <div className="border-t border-white/[0.08] pt-7">
                <p className="mb-5 text-[10px] font-semibold tracking-[0.16em] text-[#98a89c] uppercase">Optional links</p>
                <div className="grid gap-7 md:grid-cols-2">
                    <StoryField id="liveDemoUrl" label="Live demo URL" hint="A public demo, if one is available. Use an http or https address." value={story.liveDemoUrl} onChange={onChange} maxLength={STORY_LIMITS.liveDemoUrl} error={errors.liveDemoUrl} type="input" inputType="url" placeholder="https://example.com" />
                    <StoryField id="projectLinks" label="Additional project links" hint="One http or https URL per line, such as documentation or a design file." value={story.projectLinks} onChange={onChange} maxLength={STORY_LIMITS.projectLinks} error={errors.projectLinks} rows={3} />
                </div>
            </div>
            <p className="border-t border-white/[0.08] pt-4 text-[11px] leading-5 text-[#819188]">This draft exists in the current page only. Refreshing will clear your story and repository lookup.</p>
        </form>
    );
}

function StorySection({ title, children }) {
    if (!children) return null;

    return <section className="border-t border-white/[0.09] py-6 first:border-0 first:pt-0"><h2 className="mb-3 text-[10px] font-semibold tracking-[0.16em] text-[#9bac9f] uppercase">{title}</h2><div className="text-sm leading-7 whitespace-pre-line text-[#e0e7dd]">{children}</div></section>;
}

function RepositoryFacts({ repository }) {
    return (
        <section className="border-t border-white/[0.09] pt-6">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-lime-300 uppercase">GitHub facts</p>
            <h2 className="mt-1 text-xl font-medium tracking-[-0.035em] text-[#eef0e7]">{repository.full_name}</h2>
            {repository.description && <p className="mt-3 text-sm leading-6 text-[#afbbb1]">{repository.description}</p>}
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-white/[0.08] py-4 text-xs">
                <div><dt className="text-[#84958b]">Stars</dt><dd className="mt-1 font-medium text-[#e6ece3]">{formatCount(repository.stars)}</dd></div>
                <div><dt className="text-[#84958b]">Forks</dt><dd className="mt-1 font-medium text-[#e6ece3]">{formatCount(repository.forks)}</dd></div>
                <div className="col-span-2"><dt className="text-[#84958b]">Languages</dt><dd className="mt-1 font-medium text-[#e6ece3]">{repository.languages.length ? repository.languages.join(' · ') : 'No language data'}</dd></div>
                {repository.open_issues > 0 && <div><dt className="text-[#84958b]">Open issues</dt><dd className="mt-1 font-medium text-[#e6ece3]">{formatCount(repository.open_issues)}</dd></div>}
            </dl>
            <a href={repository.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-lime-200 underline decoration-lime-200/30 underline-offset-4 hover:decoration-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-lime-300">View source repository <ArrowUpRight className="h-3 w-3" /></a>
        </section>
    );
}

function RecentActivity({ repository }) {
    return (
        <section className="mt-8 border-t border-white/[0.09] pt-6">
            <div className="flex items-end justify-between gap-3">
                <div><p className="text-[10px] font-semibold tracking-[0.16em] text-lime-300 uppercase">Repository activity</p><h2 className="mt-1 text-xl font-medium tracking-[-0.035em] text-[#eef0e7]">Recent commits</h2></div>
                <span className="text-[10px] text-[#87958d]">{repository.activity.length} of 8</span>
            </div>
            {repository.activity.length ? (
                <ol className="relative mt-5 ml-1 border-l border-white/[0.12]">
                    {repository.activity.map((commit, index) => (
                        <li key={commit.sha} className="relative pb-5 pl-5 last:pb-0">
                            <span className={`absolute -left-[5px] top-1.5 h-[9px] w-[9px] rounded-full ring-4 ring-[#071512] ${index === repository.activity.length - 1 ? 'bg-lime-300' : 'bg-[#72847a]'}`} />
                            <a href={commit.url} target="_blank" rel="noreferrer" className="text-xs leading-5 font-medium text-[#e5ebe2] hover:text-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300">{commit.message}<ArrowUpRight className="ml-1 inline h-3 w-3 text-[#809087]" /></a>
                            <p className="mt-1 text-[10px] text-[#819188]"><span className="font-mono text-lime-200/80">{commit.short_sha}</span><span className="px-2 text-[#53665b]">·</span>{commit.author}<span className="px-2 text-[#53665b]">·</span><time dateTime={commit.date || undefined}>{formatDate(commit.date)}</time></p>
                        </li>
                    ))}
                </ol>
            ) : <p className="mt-4 rounded-lg border border-dashed border-white/[0.13] px-4 py-5 text-xs leading-5 text-[#94a399]">No recent commits were returned for the repository’s default branch.</p>}
            <p className="mt-5 text-[10px] leading-5 text-[#87958d]">Commit history is evidence of repository activity. It does not establish that a feature works or describe a personal contribution.</p>
        </section>
    );
}

function CaseStudyPreview({ repository, story, onEdit, onExport }) {
    const features = story.features.split(/\r?\n/).map((feature) => feature.trim()).filter(Boolean);
    const links = parseProjectLinks(story.projectLinks).filter(isSafeHttpUrl);

    return (
        <div>
            <div className="mb-8 flex flex-col gap-4 border-b border-white/[0.09] pb-7 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-[10px] font-semibold tracking-[0.16em] text-lime-300 uppercase">Case study preview · developer-written</p><h2 id="case-study-heading" tabIndex="-1" className="mt-2 text-3xl font-medium tracking-[-0.05em] text-[#f1f2e9] focus:outline-none sm:text-4xl">{story.title}</h2></div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={onEdit} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/[0.14] px-4 text-xs font-medium text-[#dce5da] transition hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300">Back to editing</button>
                    <button type="button" onClick={onExport} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-lime-300 px-4 text-xs font-semibold text-[#10180d] transition hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200">Export Markdown <ArrowUpRight className="h-3.5 w-3.5" /></button>
                </div>
            </div>
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)] lg:gap-16">
                <article>
                    <p className="mb-8 max-w-3xl text-xl leading-8 text-[#e5ebe2]">{story.summary}</p>
                    <StorySection title="The problem">{story.problem}</StorySection>
                    <StorySection title="My contribution">{story.contribution}</StorySection>
                    {features.length > 0 && <section className="border-t border-white/[0.09] py-6"><h2 className="mb-3 text-[10px] font-semibold tracking-[0.16em] text-[#9bac9f] uppercase">Key features</h2><ul className="space-y-2">{features.map((feature, index) => <li key={`${feature}-${index}`} className="flex gap-3 text-sm leading-6 text-[#e0e7dd]"><span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-lime-300" />{feature}</li>)}</ul></section>}
                    <StorySection title="Technical challenges">{story.challenges}</StorySection>
                    <StorySection title="Lessons learned">{story.lessons}</StorySection>
                    {(isSafeHttpUrl(story.liveDemoUrl) || links.length > 0) && (
                        <section className="border-t border-white/[0.09] py-6"><h2 className="mb-3 text-[10px] font-semibold tracking-[0.16em] text-[#9bac9f] uppercase">Project links</h2><ul className="space-y-2 text-sm">{isSafeHttpUrl(story.liveDemoUrl) && <li><a href={story.liveDemoUrl.trim()} target="_blank" rel="noreferrer" className="text-lime-200 underline decoration-lime-200/30 underline-offset-4 hover:decoration-lime-200">Live demo <ArrowUpRight className="ml-1 inline h-3 w-3" /></a></li>}{links.map((link) => <li key={link}><a href={link} target="_blank" rel="noreferrer" className="break-all text-lime-200 underline decoration-lime-200/30 underline-offset-4 hover:decoration-lime-200">{link} <ArrowUpRight className="ml-1 inline h-3 w-3" /></a></li>)}</ul></section>
                    )}
                </article>
                <aside>
                    <div className="mb-6 border-l-2 border-lime-300 pl-4 text-xs leading-5 text-[#aab8ad]">The story on this side is written by the developer. Repository activity and metadata below come from GitHub.</div>
                    <RepositoryFacts repository={repository} />
                    <RecentActivity repository={repository} />
                </aside>
            </div>
        </div>
    );
}

function RepositoryOverview({ repository }) {
    const [mode, setMode] = useState('edit');
    const [errors, setErrors] = useState({});
    const [story, setStory] = useState({
        title: repository.name,
        summary: '',
        problem: '',
        contribution: '',
        features: '',
        challenges: '',
        lessons: '',
        liveDemoUrl: '',
        projectLinks: '',
    });

    function updateStory(field, value) {
        setStory((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    }

    function validate() {
        const validationErrors = validateStory(story);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length) {
            document.getElementById(Object.keys(validationErrors)[0])?.focus();
            return false;
        }

        return true;
    }

    function preview(event) {
        event.preventDefault();
        if (validate()) {
            setMode('preview');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            window.requestAnimationFrame(() => document.getElementById('case-study-heading')?.focus());
        }
    }

    function exportMarkdown() {
        if (validate()) downloadCaseStudyMarkdown(story, repository);
    }

    function returnToEditing() {
        setMode('edit');
        window.requestAnimationFrame(() => document.getElementById('title')?.focus());
    }

    return (
        <section className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-10 sm:px-10 lg:px-12 lg:pt-14">
            <div className="mb-9 flex flex-col justify-between gap-5 border-b border-white/[0.09] pb-7 sm:flex-row sm:items-end">
                <div><p className="mb-3 text-[11px] font-medium tracking-[0.18em] text-lime-300 uppercase">Repository evidence <span className="mx-1.5 text-[#66766d]">/</span> GitHub public data</p><h1 className="text-3xl font-semibold tracking-[-0.06em] text-[#f3f3e9] sm:text-5xl">{repository.full_name}</h1></div>
                <a href={repository.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border border-white/[0.14] px-4 text-sm font-medium text-[#e4eae1] transition hover:border-lime-200/50 hover:text-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-lime-300 sm:self-auto"><GitHubMark className="h-4 w-4" /> View on GitHub <ArrowUpRight className="h-3.5 w-3.5" /></a>
            </div>

            {mode === 'preview'
                ? <CaseStudyPreview repository={repository} story={story} onEdit={returnToEditing} onExport={exportMarkdown} />
                : <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)] lg:gap-16">
                    <StoryEditor story={story} errors={errors} onChange={updateStory} onPreview={preview} onExport={exportMarkdown} />
                    <aside className="lg:border-l lg:border-white/[0.09] lg:pl-9">
                        <RepositoryFacts repository={repository} />
                        <RecentActivity repository={repository} />
                    </aside>
                </div>}
        </section>
    );
}

function EmptyPreview() {
    return (
        <div className="relative mx-auto w-full max-w-[32rem] lg:ml-auto">
            <div className="absolute -inset-10 rounded-[3rem] bg-lime-300/[0.035] blur-3xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.11] bg-[#0b1916]/90 shadow-[0_32px_100px_-35px_rgba(0,0,0,0.9)]">
                <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-4 sm:px-6"><div className="grid h-9 w-9 place-items-center rounded-lg border border-lime-200/15 bg-lime-200/[0.04]"><Mark className="h-6 w-6 text-lime-300" /></div><div><p className="text-sm font-medium tracking-tight text-[#ecf0e7]">A project, in context</p><p className="mt-0.5 text-[10px] tracking-wide text-[#819188]">REPOSITORY + YOUR STORY</p></div></div>
                <div className="px-6 py-8 sm:px-8 sm:py-10">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] px-3 py-1.5 text-[10px] text-[#9ba89f]"><span className="h-1.5 w-1.5 rounded-full bg-[#73857a]" />Waiting for a public repository</span>
                    <h2 className="mt-6 max-w-sm text-3xl leading-tight font-medium tracking-[-0.055em] text-[#f0f1e8]">A clearer way to show what you built.</h2>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-[#a1aea5]">Start with real repository facts. Add the decisions, contributions, and lessons GitHub cannot tell for you.</p>
                    <div className="mt-8 space-y-0 border-l border-white/[0.12] pl-5"><div className="relative pb-6"><span className="absolute -left-[25px] top-1 h-2 w-2 rounded-full bg-lime-300 ring-4 ring-[#0b1916]" /><p className="text-sm font-medium text-[#e8ede4]">Repository facts</p><p className="mt-1 text-xs leading-5 text-[#829188]">Description, languages, stars, and commit history</p></div><div className="relative"><span className="absolute -left-[25px] top-1 h-2 w-2 rounded-full bg-[#6f8177] ring-4 ring-[#0b1916]" /><p className="text-sm font-medium text-[#d3ddd4]">Your project story</p><p className="mt-1 text-xs leading-5 text-[#829188]">Problem, personal contribution, features, and lessons</p></div></div>
                </div>
                <div className="border-t border-white/[0.08] bg-white/[0.015] px-6 py-3 text-[10px] text-[#84938a] sm:px-8">Nothing here is sample data. Your repository overview appears after lookup.</div>
            </div>
        </div>
    );
}

export default function Home() {
    const { repository } = usePage().props;
    const form = useForm({ repository_url: '' });

    function handleSubmit(event) {
        event.preventDefault();
        form.post('/repositories/lookup', {
            preserveScroll: true,
            onSuccess: () => window.requestAnimationFrame(() => {
                const title = document.getElementById('title');
                title?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                title?.focus();
            }),
        });
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#071512] text-[#f1f2e9]">
            <div className="pointer-events-none absolute inset-0 grid-glow opacity-70" aria-hidden="true" />
            <div className="pointer-events-none absolute -top-56 left-1/2 h-[34rem] w-[54rem] -translate-x-1/2 rounded-full bg-lime-300/[0.045] blur-[130px]" aria-hidden="true" />
            <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-10 lg:px-12"><a href="/" className="group flex items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300" aria-label="ShipProof home"><Mark className="h-9 w-9 text-lime-300 transition-transform duration-300 group-hover:rotate-[-8deg]" /><span className="text-[17px] font-semibold tracking-[-0.04em] text-[#f6f4e9]">shipproof<span className="text-lime-300">.</span></span></a><span className="hidden text-[11px] tracking-[0.14em] text-[#8b9b91] uppercase sm:block">Make progress legible</span></header>

            {repository ? <RepositoryOverview key={repository.full_name} repository={repository} /> : (
                <section className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-16 px-6 pb-24 pt-14 sm:px-10 sm:pt-20 lg:grid-cols-[1fr_0.92fr] lg:gap-12 lg:px-12 lg:pb-32 lg:pt-24">
                    <div className="max-w-2xl">
                        <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-lime-200/15 bg-lime-200/[0.045] px-3.5 py-2 text-[11px] font-medium tracking-[0.13em] text-lime-200/90 uppercase"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-lime-300" /></span>Proof for the work you ship</div>
                        <h1 className="max-w-[13ch] text-[3.5rem] leading-[0.99] font-semibold tracking-[-0.075em] text-[#f5f3e9] sm:text-7xl lg:text-[5.6rem]">Show the work <span className="text-[#6f8278]">behind</span> the work.</h1>
                        <p className="mt-7 max-w-lg text-base leading-7 text-[#a8b5ab] sm:text-lg sm:leading-8">Turn public GitHub activity into a project story people can understand. Repository evidence stays distinct from what you say about your own work.</p>
                        <form onSubmit={handleSubmit} className="mt-10 max-w-xl" aria-busy={form.processing}>
                            <label htmlFor="repository-url" className="mb-2.5 block text-xs font-medium tracking-wide text-[#d7e0d6]">Start with a public repository</label>
                            <div className={`flex flex-col gap-2 rounded-2xl border bg-[#0c1b17]/95 p-2 shadow-2xl shadow-black/30 transition focus-within:ring-4 sm:flex-row ${form.errors.repository_url || form.errors.lookup ? 'border-rose-300/60 focus-within:ring-rose-200/[0.07]' : 'border-white/[0.12] focus-within:border-lime-300/50 focus-within:ring-lime-300/[0.06]'}`}>
                                <div className="flex min-w-0 flex-1 items-center gap-3 px-3"><GitHubMark className="h-4 w-4 shrink-0 text-[#85968b]" /><input id="repository-url" name="repository_url" type="url" inputMode="url" autoComplete="url" required maxLength="2048" placeholder="https://github.com/you/project" value={form.data.repository_url} onChange={(event) => form.setData('repository_url', event.target.value)} aria-invalid={Boolean(form.errors.repository_url || form.errors.lookup)} aria-describedby={(form.errors.repository_url || form.errors.lookup) ? 'repository-error' : 'repository-hint'} className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#f4f4eb] outline-none placeholder:text-[#829188]" /></div>
                                <button type="submit" disabled={form.processing} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-semibold text-[#10180d] transition hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200 active:scale-[0.98] disabled:cursor-wait disabled:opacity-75">{form.processing ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#183016]/25 border-t-[#183016]" />Checking repository…</> : <>Explore repo <ArrowUpRight className="h-4 w-4" /></>}</button>
                            </div>
                            {(form.errors.repository_url || form.errors.lookup) ? <p id="repository-error" role="alert" className="mt-3 text-xs leading-5 text-rose-200">{form.errors.repository_url || form.errors.lookup}</p> : <p id="repository-hint" className="mt-3 flex items-center gap-2 text-[11px] text-[#829289]"><span className="h-1 w-1 rounded-full bg-lime-300" />Public repositories only · No sign-in needed</p>}
                        </form>
                        <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/[0.08] pt-6 text-xs text-[#8d9d93]"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" />Facts from GitHub</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#a5c9ce]" />Your story, your words</span></div>
                    </div>
                    <EmptyPreview />
                </section>
            )}

            <footer className="relative z-10 mx-auto flex max-w-7xl flex-col gap-3 border-t border-white/[0.07] px-6 py-6 text-[10px] text-[#788a80] sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-12"><span>© 2026 ShipProof</span><span>Repository activity is evidence of changes, not proof a feature works.</span></footer>
        </main>
    );
}
