export interface SeriesItem {
  id: string;
  name: string;
  niche: string;
  language: string;
  duration: string;
  platforms: string[];
  videoCount: number;
  status: 'active' | 'paused';
  updatedAt: string;
  description: string;
  voice: string;
  visualStyle: string;
  captionStyle: string;
  coverImage: string;
}

export const INITIAL_SERIES: SeriesItem[] = [
  {
    id: 'classic-british-cars',
    name: 'Classic British Cars',
    niche: 'Automotive',
    language: 'English',
    duration: '60 sec',
    platforms: ['TikTok', 'Instagram Reels', 'YouTube Shorts'],
    videoCount: 12,
    status: 'active',
    updatedAt: '2 hours ago',
    description: 'Short documentary-style videos about iconic British engineering, forgotten classics, and speed legends.',
    voice: 'George (Male · Deep British)',
    visualStyle: 'Cinematic HD',
    captionStyle: 'Hormozi (Bold Yellow)',
    coverImage: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'mysteries-of-history',
    name: 'Mysteries of History',
    niche: 'History',
    language: 'Português',
    duration: '45 sec',
    platforms: ['TikTok', 'YouTube Shorts'],
    videoCount: 8,
    status: 'active',
    updatedAt: '1 day ago',
    description: 'Unexplained events, ancient secrets, and forgotten historical phenomena brought to life with AI visuals.',
    voice: 'James (Male · Documentary)',
    visualStyle: 'Dark Vintage',
    captionStyle: 'Dynamic Neon',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'dark-facts',
    name: 'Dark Facts & Curiosities',
    niche: 'Mystery',
    language: 'Português',
    duration: '30 sec',
    platforms: ['TikTok', 'Instagram Reels'],
    videoCount: 4,
    status: 'paused',
    updatedAt: '3 days ago',
    description: 'Disturbing and fascinating scientific facts that sound completely fake but are 100% true.',
    voice: 'Sarah (Female · Natural)',
    visualStyle: 'Realistic Dark',
    captionStyle: 'Hormozi (Bold Yellow)',
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'money-secrets',
    name: 'Money & Wealth Secrets',
    niche: 'Finance',
    language: 'English',
    duration: '60 sec',
    platforms: ['YouTube Shorts', 'Instagram Reels'],
    videoCount: 15,
    status: 'active',
    updatedAt: '5 hours ago',
    description: 'Financial principles, wealth building hacks, and compound interest lessons explained simply.',
    voice: 'Emily (Female · Calm)',
    visualStyle: 'Modern Luxury',
    captionStyle: 'Minimal Elegant',
    coverImage: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=500&auto=format&fit=crop&q=80',
  },
];
