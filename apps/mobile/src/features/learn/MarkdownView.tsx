import { Fragment, useMemo } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { SvgXml } from "react-native-svg";

import {
  useTheme,
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
} from "../../theme";
import { LEARN_IMAGES } from "./generated/images";
import { parseMarkdown } from "./markdown";
import type { MdBlock, MdInline } from "./markdown";

const MONO = Platform.OS === "ios" ? "Menlo" : "monospace";

/** Width / height of an SVG from its viewBox, or 1 when it has none. */
function svgAspect(xml: string): number {
  const box = xml
    .match(/viewBox="([\d.\s-]+)"/)?.[1]
    .split(/\s+/)
    .map(Number);
  return box && box[2] > 0 && box[3] > 0 ? box[2] / box[3] : 1;
}

/**
 * Renders a learn article's markdown with native text (see `markdown.ts`
 * for the subset). Links into the app (`/learn/…`, `/practice/…`) navigate
 * inside it; other links open in the browser. The figures are the web's
 * SVGs, bundled; the web-only interactive demos (`![demo:…]()`) are left
 * out.
 */
export function MarkdownView({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <View style={styles.root}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} first={i === 0} />
      ))}
    </View>
  );
}

function useOpenLink() {
  const router = useRouter();
  return (href: string) => {
    if (/^\/(learn|practice|play)(\/|$)/.test(href)) {
      router.push(href as Href);
    } else if (/^https?:\/\//.test(href)) {
      void Linking.openURL(href);
    }
  };
}

function Inline({ nodes }: { nodes: MdInline[] }) {
  const { colors } = useTheme();
  const openLink = useOpenLink();
  return (
    <>
      {nodes.map((node, i) => {
        switch (node.type) {
          case "text":
            return <Fragment key={i}>{node.text}</Fragment>;
          case "bold":
            return (
              <Text key={i} style={styles.bold}>
                <Inline nodes={node.children} />
              </Text>
            );
          case "italic":
            return (
              <Text key={i} style={styles.italic}>
                <Inline nodes={node.children} />
              </Text>
            );
          case "code":
            return (
              <Text
                key={i}
                style={[styles.inlineCode, { backgroundColor: colors.muted }]}
              >
                {node.text}
              </Text>
            );
          case "math":
            return (
              <Text key={i} style={styles.math}>
                {node.text}
              </Text>
            );
          case "link":
            return (
              <Text
                key={i}
                style={[styles.link, { color: colors.primary }]}
                onPress={() => openLink(node.href)}
                accessibilityRole="link"
              >
                <Inline nodes={node.children} />
              </Text>
            );
        }
      })}
    </>
  );
}

function Block({ block, first }: { block: MdBlock; first?: boolean }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const body = { color: colors.foreground };

  switch (block.type) {
    case "heading": {
      // The article's own `#` title duplicates the screen title; drop it.
      if (block.level === 1 && first) return null;
      const size = [0, 24, 20, 18, 16, 16, 16][block.level];
      return (
        <Text
          accessibilityRole="header"
          style={[
            styles.heading,
            body,
            {
              fontSize: size,
              marginTop: block.level <= 2 ? spacing.lg : spacing.md,
            },
          ]}
        >
          <Inline nodes={block.inline} />
        </Text>
      );
    }
    case "paragraph":
      return (
        <Text style={[styles.paragraph, body]}>
          <Inline nodes={block.inline} />
        </Text>
      );
    case "list":
      return (
        <View style={styles.list}>
          {block.items.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={[styles.bullet, { color: colors.mutedForeground }]}>
                {block.ordered ? `${block.start + i}.` : "•"}
              </Text>
              <View style={styles.listBody}>
                <Text style={[styles.paragraph, body]}>
                  <Inline nodes={item.inline} />
                </Text>
                {item.children.map((child, j) => (
                  <Block key={j} block={child} />
                ))}
              </View>
            </View>
          ))}
        </View>
      );
    case "table":
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.table, { borderColor: colors.border }]}>
            {[block.header, ...block.rows].map((row, r) => (
              <View
                key={r}
                style={[
                  styles.tableRow,
                  { borderColor: colors.border },
                  r === 0 && { backgroundColor: colors.muted },
                ]}
              >
                {row.map((cell, c) => (
                  <Text
                    key={c}
                    style={[styles.tableCell, body, r === 0 && styles.bold]}
                  >
                    <Inline nodes={cell} />
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      );
    case "quote":
      return (
        <View style={[styles.quote, { borderLeftColor: colors.primary }]}>
          {block.blocks.map((child, i) => (
            <Block key={i} block={child} />
          ))}
        </View>
      );
    case "rule":
      return <View style={[styles.rule, { backgroundColor: colors.border }]} />;
    case "code":
      return (
        <ScrollView
          horizontal
          style={[styles.codeBlock, { backgroundColor: colors.muted }]}
        >
          <Text style={[styles.codeText, body]}>{block.text}</Text>
        </ScrollView>
      );
    case "math":
      return (
        <Text style={[styles.mathBlock, body]} selectable>
          {block.text}
        </Text>
      );
    case "image": {
      const xml = LEARN_IMAGES[block.src];
      if (!xml) return null;
      const imageWidth = Math.min(width - spacing.lg * 2, 420);
      return (
        <View style={styles.figure} accessibilityLabel={block.alt}>
          <SvgXml
            xml={xml}
            width={imageWidth}
            height={imageWidth / svgAspect(xml)}
          />
          {block.alt ? (
            <Text style={[styles.caption, { color: colors.mutedForeground }]}>
              {block.alt}
            </Text>
          ) : null}
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm + 4,
  },
  heading: {
    fontWeight: fontWeight.bold,
    lineHeight: 30,
  },
  paragraph: {
    fontSize: fontSize.md,
    lineHeight: 26,
  },
  bold: {
    fontWeight: fontWeight.bold,
  },
  italic: {
    fontStyle: "italic",
  },
  inlineCode: {
    fontFamily: MONO,
    fontSize: fontSize.sm,
  },
  math: {
    fontStyle: "italic",
  },
  link: {
    textDecorationLine: "underline",
  },
  list: {
    gap: spacing.xs,
  },
  listItem: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  bullet: {
    fontSize: fontSize.md,
    lineHeight: 26,
    minWidth: 16,
  },
  listBody: {
    flex: 1,
    gap: spacing.xs,
  },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableCell: {
    width: 120,
    padding: spacing.sm,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  quote: {
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    gap: spacing.sm,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  codeBlock: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  codeText: {
    fontFamily: MONO,
    fontSize: fontSize.sm,
  },
  mathBlock: {
    fontSize: fontSize.lg,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
  figure: {
    alignItems: "center",
    gap: spacing.xs,
  },
  caption: {
    fontSize: fontSize.sm,
    textAlign: "center",
  },
});
