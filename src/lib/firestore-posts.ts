import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export interface FirestorePost {
  id?: string;
  authorId: string;
  businessId: string;
  authorName: string;
  authorAvatar: string;
  businessName: string;
  isVerifiedBusiness: boolean;
  content: string;
  mediaType: 'text' | 'image' | 'video';
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  likeCount: number;
  commentCount: number;
  status: 'published' | 'hidden' | 'flagged';
  createdAt?: string | number | null;
}

export interface CreatePostPayload {
  authorId: string;
  businessId: string;
  authorName: string;
  authorAvatar: string;
  businessName: string;
  isVerifiedBusiness: boolean;
  content: string;
  mediaType: 'image' | 'video' | 'text';
  mediaUrl?: string;
  thumbnailUrl?: string;
}

/**
 * Creates a new feed post document in Cloud Firestore
 */
export async function createFirestorePost(payload: CreatePostPayload): Promise<string> {
  if (!firestore) {
    throw new Error('Firestore is not initialized. Please configure Firebase credentials.');
  }

  const postsRef = collection(firestore, 'posts');

  const docRef = await addDoc(postsRef, {
    authorId: payload.authorId,
    businessId: payload.businessId,
    authorName: payload.authorName,
    authorAvatar: payload.authorAvatar || '',
    businessName: payload.businessName,
    isVerifiedBusiness: payload.isVerifiedBusiness,
    content: payload.content,
    mediaType: payload.mediaType,
    mediaUrl: payload.mediaUrl || null,
    thumbnailUrl: payload.thumbnailUrl || null,
    likeCount: 0,
    commentCount: 0,
    status: 'published',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Fetches feed posts from Cloud Firestore ordered by newest first
 */
export async function getFirestoreFeed(pageSize = 20, lastDoc?: QueryDocumentSnapshot<DocumentData>) {
  if (!firestore) return { posts: [], lastDoc: null };

  const postsRef = collection(firestore, 'posts');
  let q = query(
    postsRef,
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastDoc) {
    q = query(
      postsRef,
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(pageSize)
    );
  }

  const snapshot = await getDocs(q);
  const posts: FirestorePost[] = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      authorId: data.authorId,
      businessId: data.businessId,
      authorName: data.authorName,
      authorAvatar: data.authorAvatar,
      businessName: data.businessName,
      isVerifiedBusiness: data.isVerifiedBusiness,
      content: data.content,
      mediaType: data.mediaType,
      mediaUrl: data.mediaUrl,
      thumbnailUrl: data.thumbnailUrl,
      likeCount: data.likeCount || 0,
      commentCount: data.commentCount || 0,
      status: data.status,
      createdAt: data.createdAt?.toMillis?.() || Date.now(),
    };
  });

  const nextLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { posts, lastDoc: nextLastDoc };
}

/**
 * Atomically increments/decrements like count for a post in Firestore
 */
export async function toggleFirestorePostLike(postId: string, delta: 1 | -1) {
  if (!firestore) return;
  const postRef = doc(firestore, 'posts', postId);
  await updateDoc(postRef, {
    likeCount: increment(delta),
  });
}

/**
 * Deletes a post document from Firestore
 */
export async function deleteFirestorePost(postId: string) {
  if (!firestore) return;
  const postRef = doc(firestore, 'posts', postId);
  await deleteDoc(postRef);
}
