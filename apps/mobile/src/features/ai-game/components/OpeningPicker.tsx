import { useMemo, useState } from "react";
import { StyleSheet, TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { CHESS_OPENINGS } from "@blindfold-chess/features/openings";
import type { ChessOpeningSeed } from "@blindfold-chess/features/openings";

import { BottomSheet, Button, ListRow, ListSection } from "../../../components";
import { useTheme, borderRadius, fontSize, spacing } from "../../../theme";

type Props = {
  onPick: (opening: ChessOpeningSeed) => void;
};

/**
 * "Choose an opening": a button that opens a sheet listing the opening
 * families the web offers at `/games/new/opening` (name, ECO code, moves),
 * with a search box. Picking one hands its PGN to the setup form, so the
 * game starts after the opening's moves.
 */
export function OpeningPicker({ onPick }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CHESS_OPENINGS;
    return CHESS_OPENINGS.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.ecoCode.toLowerCase().includes(q) ||
        o.pgn.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <>
      <Button
        title={t("aiGame.setup.chooseOpening")}
        variant="outline"
        size="sm"
        onPress={() => setOpen(true)}
      />
      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={t("aiGame.setup.chooseOpening")}
        size="tall"
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("aiGame.setup.searchOpening")}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={[
            styles.search,
            {
              color: colors.foreground,
              backgroundColor: colors.muted,
            },
          ]}
        />
        <ListSection>
          {results.map((opening) => (
            <ListRow
              key={opening.slug}
              title={opening.name}
              subtitle={`${opening.ecoCode} · ${opening.pgn}`}
              accessory="none"
              onPress={() => {
                onPick(opening);
                setOpen(false);
              }}
            />
          ))}
        </ListSection>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
});
