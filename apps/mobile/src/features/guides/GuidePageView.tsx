import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, TextStyle } from "react-native";
import { router, type Href } from "expo-router";
import { useTranslation } from "react-i18next";

import { ListRow, ListSection } from "../../components";
import { openWebPage } from "../../lib/web-pages";
import { fontSize, fontWeight, spacing, useTheme } from "../../theme";
import { guideLinkTarget, parseProse } from "./content";
import { GUIDE_VISUAL_AIDS } from "./generated/visual-aids";
import type {
  GuideInlineLink,
  GuideLocaleContent,
  GuidePage,
  GuideParagraph,
} from "./types";
import { VISUAL_AID_RENDERERS } from "./visual-aids/renderers";

/**
 * One page of a guide: each paragraph, then the board or table the web
 * draws after it, then its link card — the web's paragraph block, in the
 * same order. `rank` and `pageNumber` (1-based) locate the visual aids and
 * links, which the web keys by rank, page and paragraph.
 */
export function GuidePageView({
  rank,
  pageNumber,
  page,
  content,
}: {
  rank: string;
  pageNumber: number;
  page: GuidePage;
  content: GuideLocaleContent;
}) {
  return (
    <View style={styles.page}>
      {page.paragraphs.map((paragraph, index) => {
        const key = `${rank}:${pageNumber}:${index}`;
        const aid = GUIDE_VISUAL_AIDS[key];
        const link = content.links[key];
        return (
          <Fragment key={key}>
            <GuideParagraphView paragraph={paragraph} />
            {aid && (
              <View style={styles.aid}>
                {VISUAL_AID_RENDERERS[aid.component](aid.props, content)}
              </View>
            )}
            {link && <GuideLinkCard link={link} />}
          </Fragment>
        );
      })}
    </View>
  );
}

/** A paragraph in whichever of its three shapes it comes in. */
export function GuideParagraphView({
  paragraph,
}: {
  paragraph: GuideParagraph;
}) {
  const { colors } = useTheme();
  const body = [styles.body, { color: colors.foreground }];

  if (typeof paragraph === "string") {
    return <Prose style={body} text={paragraph} />;
  }
  if ("items" in paragraph) {
    return (
      <View style={styles.list}>
        {paragraph.items.map((item, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={[body, styles.bullet]}>•</Text>
            <Prose style={[body, styles.listText]} text={item} />
          </View>
        ))}
      </View>
    );
  }
  return (
    <View>
      <Text style={[body, styles.heading]}>{paragraph.heading}</Text>
      <Prose style={body} text={paragraph.body} />
    </View>
  );
}

/**
 * Prose with the web's glossary markup: a term the bundled glossary has is
 * tappable and opens its sheet, the in-app counterpart of the web's term
 * modal. Authored line breaks stay, as the web's `whitespace-pre-line` keeps
 * them.
 */
function Prose({ text, style }: { text: string; style: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  const segments = parseProse(text);
  return (
    <Text style={style}>
      {segments.map((segment, i) =>
        segment.type === "text" ? (
          segment.value
        ) : (
          <Text
            key={i}
            accessibilityRole="link"
            onPress={() => router.push(`/glossary/${segment.slug}` as Href)}
            style={[styles.term, { color: colors.primary }]}
          >
            {segment.label}
          </Text>
        ),
      )}
    </Text>
  );
}

/**
 * The web's link card as a list row. The app's own screen opens when it has
 * the page (a bundled article, a practice, another guide); anything else —
 * kata, chunks, a position-memory problem, the AI game from a position —
 * opens on the web, marked with the external accessory.
 */
function GuideLinkCard({ link }: { link: GuideInlineLink }) {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const target = guideLinkTarget(link.href);
  return (
    <View style={styles.linkBlock}>
      {link.leadIn ? (
        <Text style={[styles.body, { color: colors.foreground }]}>
          {link.leadIn}
        </Text>
      ) : null}
      <ListSection>
        <ListRow
          title={link.label}
          accessory={target.kind === "web" ? "external" : "chevron"}
          onPress={() =>
            target.kind === "app"
              ? router.push(target.href as Href)
              : openWebPage(target.path, i18n.language)
          }
        />
      </ListSection>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.md,
  },
  body: {
    fontSize: fontSize.md,
    lineHeight: 26,
  },
  heading: {
    fontWeight: fontWeight.bold,
  },
  term: {
    textDecorationLine: "underline",
  },
  list: {
    gap: spacing.sm,
  },
  listItem: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  bullet: {
    width: 12,
  },
  listText: {
    flex: 1,
  },
  aid: {
    paddingVertical: spacing.xs,
  },
  linkBlock: {
    gap: spacing.sm,
  },
});
