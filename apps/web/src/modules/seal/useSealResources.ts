import { computed, ref } from 'vue';
import { useDirectoryStore } from '../../shared/directory';
import { listSealAssets } from './seal.api';
import type { SealAsset } from './seal.types';

export function useSealResources() {
  const directory = useDirectoryStore();
  const assets = ref<SealAsset[]>([]);
  const loading = ref(false);

  const usersById = computed(() => new Map(directory.users.map((user) => [user.id, user])));
  const departmentsById = computed(
    () => new Map(directory.departments.map((department) => [department.id, department])),
  );

  async function load(): Promise<void> {
    loading.value = true;
    try {
      const [, loadedAssets] = await Promise.all([directory.load(), listSealAssets()]);
      assets.value = loadedAssets;
    } finally {
      loading.value = false;
    }
  }

  function userName(id: string | null | undefined): string {
    return (id && usersById.value.get(id)?.displayName) || '-';
  }

  function departmentName(id: string | null | undefined): string {
    return (id && departmentsById.value.get(id)?.name) || '-';
  }

  function assetName(id: string): string {
    return assets.value.find((asset) => asset.id === id)?.name ?? id;
  }

  return {
    assets,
    directory,
    loading,
    load,
    userName,
    departmentName,
    assetName,
  };
}
