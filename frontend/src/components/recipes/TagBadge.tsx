import type { Tag } from '../../types/tag'

interface TagBadgeProps {
  tag: Tag
}

function TagBadge ({ tag }: TagBadgeProps) {
  const boardVisible = tag.board_visible
  return (
    <span
      className={[
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        boardVisible
          ? 'bg-[var(--color-sage-muted)] text-[var(--color-sage-deep)]'
          : 'border border-[var(--color-border)] bg-transparent text-[var(--color-ink-muted)]'
      ].join(' ')}
      title={boardVisible ? 'Shown on weekly board' : 'Catalog only'}
    >
      {tag.name}
    </span>
  )
}

export default TagBadge
