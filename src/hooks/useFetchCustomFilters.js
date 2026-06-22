import { useEffect, useState } from 'react';
import { fetchFilterGroups } from '../api/filterOptions';

function useFetchCustomFilters(baseUrl, owner, token, refreshTrigger = 0) {
  const [filterGroups, setFilterGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadFilters = async () => {
      if (!baseUrl || !owner) {
        setFilterGroups([]);
        return;
      }

      setIsLoading(true);
      try {
        const groups = await fetchFilterGroups(baseUrl, owner, token);
        if (isMounted) setFilterGroups(groups);
      } catch (error) {
        console.log('Custom filter options are not available yet:', error);
        if (isMounted) setFilterGroups([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadFilters();

    return () => {
      isMounted = false;
    };
  }, [baseUrl, owner, token, refreshTrigger]);

  return [filterGroups, isLoading, setFilterGroups];
}

export default useFetchCustomFilters;
