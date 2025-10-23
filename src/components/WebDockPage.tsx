import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, ExternalLink, GripVertical, Trash2, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { WebDockSite } from '@/types';

const MAX_SITES = 5;

export default function WebDockPage() {
  const { user } = useAuth();
  const { updateUser } = useData();
  const { toast } = useToast();

  const [sites, setSites] = useState<WebDockSite[]>(user?.webDockSites || []);
  const [selectedSite, setSelectedSite] = useState<WebDockSite | null>(null);
  const [panelWidth, setPanelWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Partial<WebDockSite> | null>(null);
  const [embedError, setEmbedError] = useState(false);

  useEffect(() => {
    if (user) {
      updateUser(user.id, { webDockSites: sites });
    }
  }, [sites]);

  useEffect(() => {
    if (!selectedSite) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - e.clientX;
        setPanelWidth(Math.max(300, Math.min(1200, newWidth)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleAddSite = () => {
    if (sites.length >= MAX_SITES) {
      toast({
        title: 'Limit reached',
        description: `You can only add ${MAX_SITES} sites.`,
        variant: 'destructive',
      });
      return;
    }

    if (!editingSite?.name || !editingSite?.url) {
      toast({
        title: 'Missing fields',
        description: 'Please provide both name and URL.',
        variant: 'destructive',
      });
      return;
    }

    try {
      new URL(editingSite.url);
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please provide a valid URL starting with https://',
        variant: 'destructive',
      });
      return;
    }

    const newSite: WebDockSite = {
      id: `site-${Date.now()}`,
      name: editingSite.name,
      url: editingSite.url,
      icon: editingSite.icon,
      order: sites.length,
    };

    setSites([...sites, newSite]);
    setEditingSite(null);
    toast({
      title: 'Added',
      description: 'Site added to Web Dock.',
    });
  };

  const handleRemoveSite = (id: string) => {
    setSites(sites.filter(s => s.id !== id));
    if (selectedSite?.id === id) {
      setSelectedSite(null);
    }
    toast({
      title: 'Removed',
      description: 'Site removed from Web Dock.',
    });
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newSites = [...sites];
    const [moved] = newSites.splice(fromIndex, 1);
    newSites.splice(toIndex, 0, moved);
    newSites.forEach((site, index) => {
      site.order = index;
    });
    setSites(newSites);
  };

  const handleOpenSite = (site: WebDockSite) => {
    setSelectedSite(site);
    setEmbedError(false);
  };

  const handleIframeError = () => {
    setEmbedError(true);
  };

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="modern-card p-6 mb-6 fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Web Dock</h1>
              <p className="text-body mt-1">
                {sites.length}/{MAX_SITES} sites
              </p>
            </div>
            <Dialog open={manageOpen} onOpenChange={setManageOpen}>
              <DialogTrigger asChild>
                <Button className="modern-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Manage Sites
                </Button>
              </DialogTrigger>
              <DialogContent className="modern-modal max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Manage Web Dock Sites</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Add New Site */}
                  <Card className="modern-card p-4">
                    <h3 className="font-semibold text-heading mb-3">Add New Site</h3>
                    <div className="space-y-3">
                      <Input
                        placeholder="Site name (e.g., WhatsApp)"
                        value={editingSite?.name || ''}
                        onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })}
                        className="modern-input"
                      />
                      <Input
                        placeholder="URL (e.g., https://web.whatsapp.com)"
                        value={editingSite?.url || ''}
                        onChange={(e) => setEditingSite({ ...editingSite, url: e.target.value })}
                        className="modern-input"
                      />
                      <Button 
                        onClick={handleAddSite} 
                        className="modern-button w-full"
                        disabled={sites.length >= MAX_SITES}
                      >
                        Add Site
                      </Button>
                    </div>
                  </Card>

                  {/* Existing Sites */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-heading">Your Sites</h3>
                    {sites.length === 0 ? (
                      <p className="text-body text-center py-8">No sites added yet</p>
                    ) : (
                      sites.map((site, index) => (
                        <Card key={site.id} className="modern-card p-4 flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-body cursor-move" />
                          <div className="flex-1">
                            <p className="font-semibold text-heading">{site.name}</p>
                            <p className="text-sm text-body truncate">{site.url}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveSite(site.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Sites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.length === 0 ? (
            <Card className="modern-card p-16 text-center col-span-full">
              <p className="text-heading text-lg font-bold mb-2">No sites added</p>
              <p className="text-body mb-4">Add your favorite websites to quick access</p>
              <Button onClick={() => setManageOpen(true)} className="modern-button">
                <Plus className="h-4 w-4 mr-2" />
                Add First Site
              </Button>
            </Card>
          ) : (
            sites.map((site) => (
              <Card
                key={site.id}
                className="modern-card p-6 cursor-pointer hover:shadow-lg transition-all"
                onClick={() => handleOpenSite(site)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                    {site.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-heading">{site.name}</h3>
                    <p className="text-sm text-body truncate">{site.url}</p>
                  </div>
                  <ExternalLink className="h-5 w-5 text-body" />
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Side Panel */}
      {selectedSite && (
        <div
          className="fixed top-0 right-0 h-screen bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col"
          style={{ width: `${panelWidth}px` }}
        >
          {/* Resize Handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition-colors"
            onMouseDown={() => setIsResizing(true)}
          />

          {/* Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold text-heading">{selectedSite.name}</h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(selectedSite.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedSite(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 relative">
            {embedError ? (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <Card className="modern-card p-8 text-center max-w-md">
                  <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-heading mb-2">Cannot Embed Site</h3>
                  <p className="text-body mb-6">
                    This website doesn't allow embedding. You can open it in a new tab instead.
                  </p>
                  <Button
                    onClick={() => window.open(selectedSite.url, '_blank')}
                    className="modern-button w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                </Card>
              </div>
            ) : (
              <iframe
                src={selectedSite.url}
                className="w-full h-full"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                onError={handleIframeError}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
