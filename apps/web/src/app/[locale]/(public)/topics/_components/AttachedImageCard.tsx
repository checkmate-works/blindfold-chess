/**
 * Subset of `post_image_attachments` columns the card needs.
 *
 * @design Component contract
 *
 * `AttachedImageCard` MUST only ever be rendered for attachments whose
 * parent `topic_post` is non-soft-deleted. The visibility rule is
 * enforced by (a) the RLS SELECT policy on `post_image_attachments`,
 * (b) the application-layer query that filters
 * `topic_posts.deleted_at IS NULL`, and (c) this contract — three
 * layers of defense, mirroring `AttachedGameCard` / `AttachedEmbedCard`.
 *
 * @design `publicUrl` is server-derived
 *
 * The aggregator builds `publicUrl` via `buildPostImagePublicUrl` from
 * `storage_path` at read time. The card never sees `storage_path`
 * directly, keeping the path-construction scheme out of any client
 * payload.
 */
export type AttachedImageCardData = {
  id: string;
  publicUrl: string;
  width: number;
  height: number;
  altText: string | null;
  displayOrder: number;
};

type Props = {
  /**
   * 1:N — a post may carry up to 3 images. Sorted by `displayOrder`
   * ascending by the aggregator. Empty arrays should not be passed
   * (the aggregator emits no map entry for an image-less post).
   */
  attachments: readonly AttachedImageCardData[];
};

export function AttachedImageCard({ attachments }: Props) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-2 mb-2 rounded-md border border-border bg-card overflow-hidden">
      <div className="p-3">
        {/* TODO(i18n): attachment.image.cardTitle */}
        <p className="text-sm font-medium text-foreground mb-2">Attached images</p>
        <ul
          className={
            attachments.length === 1
              ? 'grid grid-cols-1 gap-2'
              : 'grid grid-cols-2 sm:grid-cols-3 gap-2'
          }
        >
          {attachments.map((image) => (
            <li key={image.id}>
              {/*
                Plain <img> rather than next/image: the public URL points at
                Supabase Storage, which is not in next.config.js' image
                optimizer remote pattern list. Adding it would route every
                image through `/_next/image` (and pay the optimizer cost)
                for content that is already user-supplied at a 2 MB cap.
                The 50-megapixel server-side ceiling + 2 MB file cap make
                a direct render the simpler choice.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.publicUrl}
                alt={image.altText ?? ''}
                width={image.width}
                height={image.height}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-auto rounded-sm border border-border bg-muted object-cover"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
