# Practice Thumbnail Screenshots

The practice menu page (`/practice`) displays thumbnail screenshots for each practice to help users understand what each exercise involves at a glance. If a screenshot is missing, a "No Image" placeholder is shown instead.

## Setup (first time only)

Install Playwright's WebKit browser:

```bash
pnpm --filter web exec playwright install webkit
```

## Capturing Screenshots

Start the dev server and run the capture script:

```bash
pnpm --filter web dev
pnpm --filter web capture-screenshots
```

This captures 12 practice session pages using an iPhone Air viewport (420x912, DPR 3) and saves them to `public/images/practice/`.

## When to Re-capture

- After UI changes to practice session pages
- After adding or removing practice features
- After changing board themes or layout

## Configuration

| Item        | Location                            |
| ----------- | ----------------------------------- |
| Script      | `scripts/capture-screenshots.ts`    |
| Target URLs | `targets` array in the script       |
| Output      | `public/images/practice/{id}.png`   |
| Viewport    | iPhone Air (420x912, DPR 3, WebKit) |

### Adding a New Practice

1. Add a new entry to the `targets` array in `scripts/capture-screenshots.ts`
2. Set `hasCountdown: true` if the page uses `BoardOverlay` for countdown
3. Run the capture script
4. Verify the image in the practice menu

### Countdown Detection

Pages with countdown overlays (3-2-1-START!) use `data-testid="countdown-overlay"` on their `BoardOverlay` component. The script waits for this element to be removed from the DOM before capturing.
