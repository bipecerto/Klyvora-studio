export interface VideoItem {
  id: string;
  title: string;
  seriesId: string;
  seriesName: string;
  niche: string;
  status: 'ready' | 'generating' | 'draft' | 'failed';
  duration: string;
  createdAt: string;
  thumbnail: string;
  views?: string;
  retention?: string;
  script?: string;
  scenes?: { id: number; title: string; image: string; duration: string; narration: string }[];
}

export const INITIAL_VIDEOS: VideoItem[] = [
  {
    id: 'vid-1',
    title: '7 British Cars Built to Last Forever',
    seriesId: 'classic-british-cars',
    seriesName: 'Classic British Cars',
    niche: 'Automotive',
    status: 'ready',
    duration: '00:58',
    createdAt: 'Today, 14:30',
    thumbnail: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&auto=format&fit=crop&q=80',
    views: '1.8M',
    retention: '97%',
    script: 'When this iconic British car roared onto the scene in 1961, even top competitors were stunned. With a top speed exceeding 240 km/h and an aerodynamic lightweight body, it reshaped sports car history forever...',
    scenes: [
      {
        id: 1,
        title: 'Scene 1: The Engine Hook',
        image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&auto=format&fit=crop&q=80',
        duration: '00:05',
        narration: 'In 1961, one engine sound changed the automobile industry forever.',
      },
      {
        id: 2,
        title: 'Scene 2: Aerodynamic Secrets',
        image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=400&auto=format&fit=crop&q=80',
        duration: '00:15',
        narration: 'Engineers spent over two years testing in secret wind tunnels at midnight.',
      },
      {
        id: 3,
        title: 'Scene 3: Legacy & Impact',
        image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&auto=format&fit=crop&q=80',
        duration: '00:38',
        narration: 'Decades later, collectors still consider it the holy grail of British motor engineering.',
      },
    ],
  },
  {
    id: 'vid-2',
    title: 'The Town That Disappeared Overnight',
    seriesId: 'mysteries-of-history',
    seriesName: 'Mysteries of History',
    niche: 'History',
    status: 'ready',
    duration: '00:44',
    createdAt: 'Yesterday, 19:10',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
    views: '2.4M',
    retention: '98%',
    script: 'Deep inside the snowbound valley, 400 villagers vanished without a single trace. Fireplaces were still lit, meals were left on tables, yet not a single footprint was found in the surrounding snow...',
    scenes: [
      {
        id: 1,
        title: 'Scene 1: The Cold Valley',
        image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80',
        duration: '00:08',
        narration: 'It was a freezing winter morning in 1923 when scouts entered the quiet valley.',
      },
      {
        id: 2,
        title: 'Scene 2: Abandoned Homes',
        image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400&auto=format&fit=crop&q=80',
        duration: '00:20',
        narration: 'Food was sitting fresh on plates, but every single human being had vanished.',
      },
    ],
  },
  {
    id: 'vid-3',
    title: 'Why This Car Was Almost Banned in Europe',
    seriesId: 'classic-british-cars',
    seriesName: 'Classic British Cars',
    niche: 'Automotive',
    status: 'generating',
    duration: '00:52',
    createdAt: '10 minutes ago',
    thumbnail: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=500&auto=format&fit=crop&q=80',
    script: 'Safety regulators in 1974 were terrified by its raw power. Here is why governments tried to stop it...',
  },
  {
    id: 'vid-4',
    title: '5 Facts That Sound Fake But Are True',
    seriesId: 'dark-facts',
    seriesName: 'Dark Facts & Curiosities',
    niche: 'Mystery',
    status: 'ready',
    duration: '00:30',
    createdAt: '2 days ago',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80',
    views: '920K',
    retention: '94%',
    script: 'Did you know sharks existed before trees? And honey never spoils even after 3000 years in Egyptian tombs...',
  },
  {
    id: 'vid-5',
    title: 'How The Rule of 72 Multiplies Savings',
    seriesId: 'money-secrets',
    seriesName: 'Money & Wealth Secrets',
    niche: 'Finance',
    status: 'ready',
    duration: '00:59',
    createdAt: '3 days ago',
    thumbnail: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=500&auto=format&fit=crop&q=80',
    views: '1.1M',
    retention: '93%',
    script: 'Divide 72 by your annual interest rate. That is the exact number of years it takes to double your net worth...',
  },
  {
    id: 'vid-6',
    title: 'The Unsolved Secret of Roman Concrete',
    seriesId: 'mysteries-of-history',
    seriesName: 'Mysteries of History',
    niche: 'History',
    status: 'draft',
    duration: '00:45',
    createdAt: '4 days ago',
    thumbnail: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=500&auto=format&fit=crop&q=80',
    script: 'Modern concrete degrades in 50 years. Roman harbors have survived seawater for 2000 years...',
  },
];
