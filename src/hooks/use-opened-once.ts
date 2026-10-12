import { useEffect, useState } from 'react';

/**
 * True from the first time `open` is true, and from then on.
 *
 * For dialogs whose code is loaded on demand: nothing is fetched or mounted
 * until the person first opens it, and after that it stays mounted so closing
 * and reopening animate normally instead of popping in and out of existence.
 */
export function useOpenedOnce(open: boolean): boolean {
  const [opened, setOpened] = useState(open);
  useEffect(() => {
    if (open) setOpened(true);
  }, [open]);
  return opened || open;
}
