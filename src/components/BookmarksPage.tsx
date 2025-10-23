import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, ExternalLink, GripVertical, Trash2, Pin, Search, Star, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon?: string;
  isPinned: boolean;
  order: number;
}

const MAX_BOOKMARKS = 10;

export default function BookmarksPage() {
  const { user } = useAuth();
  const { updateUser, users } = useData();
  const { toast } = useToast();

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // Load bookmarks from user data - reload whenever user data changes
  useEffect(() => {
    if (user) {
      const currentUser = users.find(u => u.id === user.id);
      if (currentUser?.webDockSites) {
        const converted = currentUser.webDockSites.map((site, index) => ({
          id: site.id,
          title: site.name,
          url: site.url,
          icon: site.icon,
          isPinned: false,
          order: index,
        }));
        setBookmarks(converted);
      } else {
        setBookmarks([]);
      }
    }
  }, [user?.id, users]);

  // Save bookmarks to user data
  const saveBookmarks = (updatedBookmarks: Bookmark[]) => {
    if (user) {
      const sites = updatedBookmarks.map(b => ({
        id: b.id,
        name: b.title,
        url: b.url,
        icon: b.icon,
        order: b.order,
      }));
      updateUser(user.id, { webDockSites: sites });
    }
  };

  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return undefined;
    }
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const handleAdd = () => {
    if (bookmarks.length >= MAX_BOOKMARKS) {
      toast({
        title: 'Limit reached',
        description: `You can only have ${MAX_BOOKMARKS} bookmarks.`,
        variant: 'destructive',
      });
      return;
    }

    if (!newTitle.trim() || !newUrl.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please provide both title and URL.',
        variant: 'destructive',
      });
      return;
    }

    try {
      new URL(newUrl);
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please provide a valid URL starting with https://',
        variant: 'destructive',
      });
      return;
    }

    const newBookmark: Bookmark = {
      id: `bookmark-${Date.now()}`,
      title: newTitle,
      url: newUrl,
      icon: getFavicon(newUrl),
      isPinned: false,
      order: bookmarks.length,
    };

    const updatedBookmarks = [...bookmarks, newBookmark];
    setBookmarks(updatedBookmarks);
    saveBookmarks(updatedBookmarks);
    setNewTitle('');
    setNewUrl('');
    setAddOpen(false);
    toast({
      title: 'Added',
      description: 'Bookmark added successfully.',
    });
  };

  const handleRemove = (id: string) => {
    const updatedBookmarks = bookmarks.filter(b => b.id !== id);
    setBookmarks(updatedBookmarks);
    saveBookmarks(updatedBookmarks);
    toast({
      title: 'Removed',
      description: 'Bookmark removed.',
    });
  };

  const handleTogglePin = (id: string) => {
    const updatedBookmarks = bookmarks.map(b => 
      b.id === id ? { ...b, isPinned: !b.isPinned } : b
    );
    setBookmarks(updatedBookmarks);
    saveBookmarks(updatedBookmarks);
  };

  const filteredBookmarks = bookmarks
    .filter(b => 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.url.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return a.order - b.order;
    });

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="modern-card p-6 mb-6 fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Bookmarks</h1>
              <p className="text-body mt-1">
                {bookmarks.length}/{MAX_BOOKMARKS} bookmarks
              </p>
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="modern-button" disabled={bookmarks.length >= MAX_BOOKMARKS}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bookmark
                </Button>
              </DialogTrigger>
              <DialogContent className="modern-modal">
                <DialogHeader>
                  <DialogTitle>Add New Bookmark</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Title (e.g., Google Drive)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="modern-input"
                  />
                  <Input
                    placeholder="URL (e.g., https://drive.google.com)"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="modern-input"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleAdd} className="modern-button flex-1">
                      Add Bookmark
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        {bookmarks.length > 0 && (
          <div className="modern-card p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-body" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bookmarks..."
                className="pl-10 modern-input"
              />
            </div>
          </div>
        )}

        {/* Bookmarks Grid */}
        {bookmarks.length === 0 ? (
          <Card className="modern-card p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Star className="h-8 w-8 text-white" />
            </div>
            <p className="text-heading text-lg font-bold mb-2">No bookmarks yet</p>
            <p className="text-body mb-4">Add your favorite websites for quick access</p>
            <Button onClick={() => setAddOpen(true)} className="modern-button">
              <Plus className="h-4 w-4 mr-2" />
              Add First Bookmark
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBookmarks.map((bookmark) => (
              <Card
                key={bookmark.id}
                className="modern-card p-6 group relative hover:shadow-xl transition-all cursor-pointer"
                style={{
                  background: bookmark.isPinned 
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
                    : undefined
                }}
              >
                {bookmark.isPinned && (
                  <div className="absolute top-3 right-3">
                    <Pin className="h-4 w-4 text-indigo-600 fill-current" />
                  </div>
                )}
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                    {bookmark.icon ? (
                      <img src={bookmark.icon} alt="" className="w-10 h-10" />
                    ) : (
                      <span className="text-white font-bold text-2xl">
                        {bookmark.title.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-heading mb-1 line-clamp-1">
                    {bookmark.title}
                  </h3>
                  <p className="text-sm text-body mb-4 line-clamp-1">
                    {getDomain(bookmark.url)}
                  </p>
                  
                  <div className="flex gap-2 w-full">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(bookmark.id);
                      }}
                      className="flex-1"
                    >
                      <Pin className={`h-4 w-4 ${bookmark.isPinned ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => window.open(bookmark.url, '_blank')}
                      className="flex-1 modern-button"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(bookmark.id);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}