import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKMARKS_KEY = '@medmentor_bookmarks';

export interface Bookmark {
  id: string;
  messageId: string;
  content: string;
  mentorName: string;
  conversationId: string;
  savedAt: string;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadBookmarks = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(BOOKMARKS_KEY);
      setBookmarks(data ? JSON.parse(data) : []);
    } catch (e) {
      setBookmarks([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const addBookmark = useCallback(async (item: Omit<Bookmark, 'id' | 'savedAt'>) => {
    const newBookmark: Bookmark = {
      ...item,
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
    };
    setBookmarks(prev => {
      const updated = [...prev, newBookmark];
      AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeBookmark = useCallback(async (messageId: string) => {
    setBookmarks(prev => {
      const updated = prev.filter(b => b.messageId !== messageId);
      AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isBookmarked = useCallback((messageId: string) => {
    return bookmarks.some(b => b.messageId === messageId);
  }, [bookmarks]);

  const toggleBookmark = useCallback(async (item: Omit<Bookmark, 'id' | 'savedAt'>) => {
    if (isBookmarked(item.messageId)) {
      await removeBookmark(item.messageId);
    } else {
      await addBookmark(item);
    }
  }, [isBookmarked, removeBookmark, addBookmark]);

  return { bookmarks, addBookmark, removeBookmark, isBookmarked, toggleBookmark, loadBookmarks, loaded };
}
