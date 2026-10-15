import { useNavigate } from 'react-router-dom';
import type { AlgorithmMeta } from '@/types';
import { algorithmsInCategory } from '@/engine/catalogue';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { Tooltip } from '@/components/primitives/Tooltip';

/**
 * Compare Mode's entry point, kept out of `ComparePage`'s module so opening an
 * algorithm does not pull the whole comparison UI into its chunk.
 */
export function CompareButton({ meta }: { meta: AlgorithmMeta }) {
  const navigate = useNavigate();
  const opponent = algorithmsInCategory(meta.category).find(
    (entry) => entry.status === 'ready' && entry.id !== meta.id,
  );

  return (
    <Tooltip label={opponent ? 'Race this against a sibling on one shared cursor' : 'No sibling is ready yet'} side="top">
      <Button
        size="icon-sm"
        variant="secondary"
        aria-label="Compare with another algorithm"
        disabled={!opponent}
        onClick={() => {
          // Land on the pair a learner most likely wants: this algorithm on the
          // left, its closest sibling on the right.
          if (opponent) navigate(`/compare/${meta.id}/${opponent.id}`);
        }}
      >
        <Icon name="users" size={15} />
      </Button>
    </Tooltip>
  );
}
