export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  size: string;
  createdAt: string;
}

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'asset-1',
    name: 'classic_engine_hd.jpg',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&auto=format&fit=crop&q=80',
    size: '2.4 MB',
    createdAt: 'Today, 10:15',
  },
  {
    id: 'asset-2',
    name: 'snow_valley_landscape.jpg',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80',
    size: '3.1 MB',
    createdAt: 'Yesterday, 18:22',
  },
  {
    id: 'asset-3',
    name: 'deep_british_narrator_sample.mp3',
    type: 'audio',
    url: '#',
    size: '1.2 MB',
    createdAt: '2 days ago',
  },
  {
    id: 'asset-4',
    name: 'galaxy_stars_motion.mp4',
    type: 'video',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop&q=80',
    size: '14.8 MB',
    createdAt: '3 days ago',
  },
  {
    id: 'asset-5',
    name: 'gold_coins_vault.jpg',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&auto=format&fit=crop&q=80',
    size: '2.8 MB',
    createdAt: '4 days ago',
  },
];
