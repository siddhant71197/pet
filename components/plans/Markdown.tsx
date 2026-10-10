"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown passes the mdast `node`; keep it off DOM elements.
function clean<P extends { node?: unknown }>(props: P): Omit<P, "node"> {
  const { node, ...rest } = props;
  void node;
  return rest;
}

const components: Components = {
  h1: (props) => (
    <h2 {...clean(props)} className="mt-6 mb-3 text-xl font-semibold tracking-tight text-stone-900 first:mt-0 dark:text-stone-100" />
  ),
  h2: (props) => (
    <h3 {...clean(props)} className="mt-7 mb-3 border-b border-stone-200 pb-1.5 text-lg font-semibold tracking-tight text-stone-900 first:mt-0 dark:border-stone-800 dark:text-stone-100" />
  ),
  h3: (props) => (
    <h4 {...clean(props)} className="mt-5 mb-2 text-base font-semibold text-teal-800 first:mt-0 dark:text-teal-300" />
  ),
  h4: (props) => (
    <h5 {...clean(props)} className="mt-4 mb-1.5 text-sm font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-300" />
  ),
  p: (props) => <p {...clean(props)} className="my-3 leading-7" />,
  ul: (props) => (
    <ul {...clean(props)} className="my-3 list-disc space-y-1.5 pl-5 marker:text-teal-500" />
  ),
  ol: (props) => (
    <ol {...clean(props)} className="my-3 list-decimal space-y-1.5 pl-5 marker:text-stone-500" />
  ),
  li: (props) => <li {...clean(props)} className="pl-1 leading-7" />,
  strong: (props) => (
    <strong {...clean(props)} className="font-semibold text-stone-900 dark:text-stone-100" />
  ),
  a: (props) => (
    <a
      {...clean(props)}
      className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-200"
      target="_blank"
      rel="noopener noreferrer nofollow"
    />
  ),
  blockquote: (props) => (
    <blockquote
      {...clean(props)}
      className="my-4 rounded-r-xl border-l-4 border-amber-400 bg-amber-50 px-4 py-2 text-stone-700 dark:border-amber-500/70 dark:bg-amber-950/30 dark:text-stone-300"
    />
  ),
  hr: () => <hr className="my-6 border-stone-200 dark:border-stone-800" />,
  code: (props) => (
    <code {...clean(props)} className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[0.85em] dark:bg-stone-800" />
  ),
  pre: (props) => (
    <pre {...clean(props)} className="my-4 overflow-x-auto rounded-xl bg-stone-100 p-4 text-sm dark:bg-stone-800 [&_code]:bg-transparent [&_code]:p-0" />
  ),
  table: (props) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
      <table {...clean(props)} className="w-full min-w-[28rem] border-collapse text-left text-sm" />
    </div>
  ),
  thead: (props) => (
    <thead {...clean(props)} className="bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100" />
  ),
  tr: (props) => (
    <tr {...clean(props)} className="border-b border-stone-200 last:border-0 even:bg-stone-50 dark:border-stone-800 dark:even:bg-stone-900/40" />
  ),
  th: (props) => (
    <th {...clean(props)} className="px-3 py-2 font-semibold whitespace-nowrap" />
  ),
  td: (props) => <td {...clean(props)} className="px-3 py-2 align-top" />,
  img: () => null,
};

/** Renders LLM markdown safely: GFM tables/lists, no raw HTML, no images. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[15px] text-stone-700 dark:text-stone-300">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
