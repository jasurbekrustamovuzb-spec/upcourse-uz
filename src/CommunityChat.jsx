import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Compass, Hash, Link2, Loader2, LockKeyhole, Megaphone, MessageCircle, Send, Share2, UserPlus, Users, X } from 'lucide-react';
import { C, EmptyState, PinnedAddButton, SectionLoading, fontBody, fontDisplay, fontMono } from './App';
import { signInWithGoogle, supabase } from './supabaseClient';

const CHAT_ACCENTS = {
  direct: '#447C8C',
  group: '#4F8A67',
  channel: '#B96E45',
  news: '#A64F46',
};

const asArray = (value) => Array.isArray(value) ? value : [];
const displayName = (person) => [person?.first_name, person?.last_name].filter(Boolean).join(' ') || (person?.username ? '@' + person.username : 'Foydalanuvchi');
const shortTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
};

function Dialog({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-black/50 p-3 sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label={title} className={'max-h-[88dvh] w-full overflow-hidden rounded-2xl border shadow-2xl ' + (wide ? 'max-w-xl' : 'max-w-md')} style={{ background: C.surface, borderColor: C.rule }}>
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: C.rule }}>
          <h2 className="text-base font-semibold" style={{ ...fontDisplay, color: C.ink }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Yopish" className="grid h-9 w-9 place-items-center rounded-xl" style={{ color: C.inkSoft, background: C.paperSoft }}><X size={17} /></button>
        </header>
        <div className="max-h-[calc(88dvh-58px)] overflow-y-auto p-4">{children}</div>
      </section>
    </div>
  );
}

export default function CommunityChatView({ session, isAdmin, onOpenProfile, directUserId, onDirectHandled, chatRequest, onChatHandled, shareResource, onShareHandled, onOpenResource, initialInviteToken }) {
  const [chats, setChats] = useState([]);
  const [publicChats, setPublicChats] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const selectedIdRef = useRef(null);
  const messageRequestRef = useRef(0);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [mobilePane, setMobilePane] = useState('list');
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState('group');
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPublic, setCreatePublic] = useState(true);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [peopleBusy, setPeopleBusy] = useState(false);
  const [members, setMembers] = useState([]);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [invitePrompt, setInvitePrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);
  const messageListRef = useRef(null);
  const readMessagesRef = useRef({ userId: null, byChat: new Map() });
  const setActiveChat = useCallback((chatId) => {
    if (selectedIdRef.current === chatId) return;
    selectedIdRef.current = chatId;
    setSelectedId(chatId);
    setMessages([]);
  }, []);

  const handledDirectRef = useRef('');
  const handledInviteRef = useRef('');

  const selectedChat = chats.find((chat) => chat.id === selectedId) || null;
  const canPost = selectedChat && (selectedChat.kind === 'news' ? isAdmin : selectedChat.is_member);
  const canManage = selectedChat && ['group', 'channel'].includes(selectedChat.kind) && ['owner', 'admin'].includes(selectedChat.my_role);

  const loadChats = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const ensureNews = await supabase.rpc('community_ensure_news_membership');
      if (ensureNews.error) console.info('News kanal a’zoligi yangilanishi kutilmoqda.');
      const [listResult, publicResult] = await Promise.all([
        supabase.rpc('community_chat_list'),
        supabase.rpc('community_public_list'),
      ]);
      if (listResult.error) throw listResult.error;
      if (publicResult.error) throw publicResult.error;
      const nextChats = asArray(listResult.data);
      setChats(nextChats);
      setPublicChats(asArray(publicResult.data));
      if (!selectedId && nextChats.length) {
        const news = nextChats.find((chat) => chat.kind === 'news');
        if (news) setActiveChat(news.id);
      }
      setError('');
    } catch (requestError) {
      console.error('Hamjamiyat chatlarini yuklab bo‘lmadi:', requestError);
      setError('Chat xizmatini yuklab bo‘lmadi. Ma’lumotlar bazasi yangilanganini tekshiring.');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, selectedId, setActiveChat]);

  const loadMessages = useCallback(async (chatId) => {
    if (!session?.user?.id || !chatId || chatId !== selectedIdRef.current) return;
    const requestId = ++messageRequestRef.current;
    setMessageLoading(true);
    try {
      const { data, error: requestError } = await supabase.rpc('community_chat_history', { p_chat_id: chatId, p_limit: 100 });
      if (requestError) throw requestError;
      if (requestId !== messageRequestRef.current || chatId !== selectedIdRef.current) return;
      setMessages(asArray(data).filter((message) => message.chat_id === chatId));
      setError('');
    } catch (requestError) {
      if (requestId !== messageRequestRef.current || chatId !== selectedIdRef.current) return;
      console.error('Chat xabarlarini yuklab bo‘lmadi:', requestError);
      setMessages([]);
      setError('Xabarlarni yuklab bo‘lmadi. Chatga a’zo ekaningizni tekshiring.');
    } finally {
      if (requestId === messageRequestRef.current && chatId === selectedIdRef.current) setMessageLoading(false);
    }
  }, [session?.user?.id]);

  const markVisibleMessages = useCallback(async (chatId, messageIds) => {
    if (!session?.user?.id || !chatId || !messageIds?.length) return;
    if (readMessagesRef.current.userId !== session.user.id) {
      readMessagesRef.current = { userId: session.user.id, byChat: new Map() };
    }
    const byChat = readMessagesRef.current.byChat;
    const marked = byChat.get(chatId) || new Set();
    byChat.set(chatId, marked);
    const pending = [...new Set(messageIds)].filter((id) => id && !marked.has(id));
    if (!pending.length) return;
    pending.forEach((id) => marked.add(id));
    const { error: markError } = await supabase.rpc('community_mark_messages_read', { p_chat_id: chatId, p_message_ids: pending });
    if (markError) {
      pending.forEach((id) => marked.delete(id));
      console.info('Xabarlarning o‘qilgan holati saqlanmadi:', markError.message);
      return;
    }
    const { data, error: listError } = await supabase.rpc('community_chat_list');
    if (!listError) setChats(asArray(data));
  }, [session?.user?.id]);

  useEffect(() => { void loadChats(); }, [loadChats]);

  useEffect(() => {
    if (!session?.user?.id) return undefined;
    const channel = supabase.channel('community-list:' + session.user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_chats' }, () => { void loadChats(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [session?.user?.id, loadChats]);

  useEffect(() => {
    if (!selectedId || !session?.user?.id) { setMessages([]); return undefined; }
    setMessages([]);
    void loadMessages(selectedId);
    const channel = supabase.channel('community-messages:' + selectedId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages', filter: 'chat_id=eq.' + selectedId }, () => {
        void loadMessages(selectedId);
        void loadChats();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [selectedId, session?.user?.id, loadMessages, loadChats]);

  useEffect(() => {
    const list = messageListRef.current;
    const nearBottom = !list || list.scrollHeight - list.scrollTop - list.clientHeight < 140;
    if (nearBottom) bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const root = messageListRef.current;
    if (!root || !selectedId || !session?.user?.id || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(() => {
      const bounds = root.getBoundingClientRect();
      const visible = [...root.querySelectorAll('[data-community-message]')].filter((node) => {
        const rect = node.getBoundingClientRect();
        const overlap = Math.max(0, Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, bounds.top));
        return overlap / Math.max(rect.height, 1) >= 0.35;
      });
      const visibleIds = visible.map((node) => node.dataset.messageId).filter(Boolean);
      if (visibleIds.length) void markVisibleMessages(selectedId, visibleIds);
    }, { root, threshold: [0.25, 0.6, 1] });
    root.querySelectorAll('[data-community-message]').forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [messages, selectedId, session?.user?.id, markVisibleMessages]);

  useEffect(() => {
    if (!directUserId) { handledDirectRef.current = ''; return; }
    if (!session?.user?.id || handledDirectRef.current === directUserId) return;
    handledDirectRef.current = directUserId;
    (async () => {
      const { data, error: requestError } = await supabase.rpc('community_start_direct', { p_user_id: directUserId });
      if (requestError) { setError('Shaxsiy chatni ochib bo‘lmadi.'); onDirectHandled?.(); return; }
      await loadChats();
      setActiveChat(data);
      setMobilePane('chat');
      onDirectHandled?.();
    })();
  }, [directUserId, session?.user?.id, loadChats, onDirectHandled]);

  useEffect(() => {
    if (!chatRequest?.chatId || !session?.user?.id) return;
    let cancelled = false;
    (async () => {
      if (!chatRequest.isMember && ['group', 'channel'].includes(chatRequest.kind)) {
        const { error: joinError } = await supabase.rpc('community_join_public_chat', { p_chat_id: chatRequest.chatId });
        if (joinError) { setError('Guruhga kirib bo‘lmadi.'); onChatHandled?.(); return; }
      }
      await loadChats();
      if (cancelled) return;
      setActiveChat(chatRequest.chatId);
      setMobilePane('chat');
      onChatHandled?.();
    })();
    return () => { cancelled = true; };
  }, [chatRequest?.nonce, chatRequest?.chatId, chatRequest?.isMember, session?.user?.id, loadChats, onChatHandled]);

  useEffect(() => {
    if (!initialInviteToken || !session?.user?.id || handledInviteRef.current === initialInviteToken) return;
    handledInviteRef.current = initialInviteToken;
    (async () => {
      const { data, error: requestError } = await supabase.rpc('community_accept_invite', { p_token: initialInviteToken });
      if (requestError) { setError('Taklif havolasi eskirgan yoki bekor qilingan.'); return; }
      await loadChats();
      setActiveChat(data);
      setMobilePane('chat');
    })();
  }, [initialInviteToken, session?.user?.id, loadChats]);

  useEffect(() => {
    if (!shareResource || !session?.user?.id) return;
    setShareOpen(true);
  }, [shareResource, session?.user?.id]);

  useEffect(() => {
    let cancelled = false;
    const query = peopleQuery.trim();
    if (!peopleOpen || query.length < 2 || !session?.user?.id) { setPeople([]); return undefined; }
    const timer = setTimeout(async () => {
      setPeopleBusy(true);
      const { data, error: requestError } = await supabase.rpc('community_search_users', { p_query: query });
      if (cancelled) return;
      if (requestError) setError('Foydalanuvchilarni qidirib bo‘lmadi.');
      else setPeople(asArray(data));
      setPeopleBusy(false);
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [peopleQuery, peopleOpen, session?.user?.id]);

  const selectChat = (chat) => {
    setActiveChat(chat.id);
    setMobilePane('chat');
    setPeopleOpen(false);
  };

  const startDirect = async (userId) => {
    setBusy(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('community_start_direct', { p_user_id: userId });
    if (requestError) setError('Shaxsiy chatni ochib bo‘lmadi.');
    else {
      await loadChats();
      setActiveChat(data);
      setMobilePane('chat');
      setPeopleOpen(false);
      setPeopleQuery('');
    }
    setBusy(false);
  };

  const createChat = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('community_create_chat', {
      p_kind: createKind, p_title: createTitle, p_description: createDescription, p_is_public: createPublic,
    });
    if (requestError) setError(requestError.message || 'Chat yaratib bo‘lmadi.');
    else {
      setCreateOpen(false);
      setCreateTitle('');
      setCreateDescription('');
      await loadChats();
      setActiveChat(data);
      setMobilePane('chat');
    }
    setBusy(false);
  };

  const joinPublic = async (chatId) => {
    setBusy(true);
    const { error: requestError } = await supabase.rpc('community_join_public_chat', { p_chat_id: chatId });
    if (requestError) setError('Ommaviy guruhga qo‘shilib bo‘lmadi.');
    else {
      await loadChats();
      setActiveChat(chatId);
      setMobilePane('chat');
    }
    setBusy(false);
  };

  const sendMessage = async (event, resource = null) => {
    event?.preventDefault?.();
    if (!selectedChat || !canPost || sending) return;
    const text = draft.trim();
    if (!text && !resource) return;
    setSending(true);
    const { error: requestError } = await supabase.rpc('community_send_message', {
      p_chat_id: selectedChat.id,
      p_body: text,
      p_resource_kind: resource?.kind || null,
      p_resource_id: resource?.id == null ? null : String(resource.id),
      p_resource_title: resource?.title || null,
      p_resource_data: resource?.data || null,
    });
    if (requestError) setError('Xabar yuborilmadi. Qayta urinib ko‘ring.');
    else {
      setDraft('');
      if (resource) onShareHandled?.();
      await loadMessages(selectedChat.id);
      await loadChats();
    }
    setSending(false);
  };

  const shareToChat = async (chat) => {
    setActiveChat(chat.id);
    setMobilePane('chat');
    const resource = {
      kind: shareResource.kind,
      id: shareResource.id,
      title: shareResource.title,
      data: shareResource.data || null,
    };
    setShareOpen(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const { error: requestError } = await supabase.rpc('community_send_message', {
      p_chat_id: chat.id,
      p_body: '',
      p_resource_kind: resource.kind,
      p_resource_id: String(resource.id),
      p_resource_title: resource.title,
      p_resource_data: resource.data,
    });
    if (requestError) setError('Materialni chatga yuborib bo‘lmadi.');
    else {
      onShareHandled?.();
      await loadMessages(chat.id);
      await loadChats();
    }
  };

  const loadMembers = async () => {
    if (!selectedId) return;
    const { data, error: requestError } = await supabase.rpc('community_chat_members_list', { p_chat_id: selectedId });
    if (requestError) { setError('A’zolar ro‘yxatini yuklab bo‘lmadi.'); return; }
    setMembers(asArray(data));
    setPeopleOpen(true);
    setPeopleQuery('');
  };

  const addMember = async (userId) => {
    if (!selectedId) return;
    const { error: requestError } = await supabase.rpc('community_add_member', { p_chat_id: selectedId, p_user_id: userId });
    if (requestError) setError('A’zoni qo‘shib bo‘lmadi.');
    else {
      await loadMembers();
      await loadChats();
    }
  };

  const createInvite = async () => {
    if (!selectedId) return;
    setInviteBusy(true);
    const { data, error: requestError } = await supabase.rpc('community_create_invite', { p_chat_id: selectedId });
    if (requestError) setError('Taklif havolasini yaratib bo‘lmadi.');
    else {
      const link = window.location.origin + '/?chatInvite=' + encodeURIComponent(data);
      try { await navigator.clipboard.writeText(link); setInvitePrompt('Taklif havolasi nusxalandi.'); }
      catch { setInvitePrompt(link); }
    }
    setInviteBusy(false);
  };

  const signIn = async () => {
    if (initialInviteToken) {
      try { sessionStorage.setItem('upcourse-pending-chat-invite', initialInviteToken); } catch {}
    }
    const { error: signInError } = await signInWithGoogle();
    if (signInError) setError('Kirishda xatolik yuz berdi.');
  };

  if (!session?.user?.id) {
    return (
      <div className="mx-auto mt-8 max-w-lg rounded-3xl border p-6 text-center sm:p-8" style={{ background: C.surface, borderColor: C.rule }}>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl" style={{ color: C.accent, background: C.paperSoft }}><MessageCircle size={22} /></span>
        <h1 className="mt-4 text-2xl" style={{ ...fontDisplay, color: C.ink }}>Hamjamiyat chatlari</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6" style={{ ...fontBody, color: C.inkSoft }}>Do‘stlar, guruhlar va kanallar bilan yozishish uchun akkauntga kiring.</p>
        <button type="button" onClick={signIn} className="mt-5 rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ ...fontBody, color: C.white, background: C.cover }}>Google orqali kirish</button>
      </div>
    );
  }

  const publicRoomsNotJoined = publicChats.filter((chat) => !chat.is_member);

  return (
    <section className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden">
      {!selectedChat && <PinnedAddButton icon={Users} label="Yangi guruh yoki kanal yaratish" onClick={() => { setCreateKind('group'); setCreateOpen(true); }} />}

      {error && <div role="alert" className="mb-3 rounded-xl border px-3 py-2 text-xs" style={{ ...fontBody, color: C.red, borderColor: C.red, background: C.dangerTint }}>{error}</div>}
      <div className="grid w-full min-w-0 grid-cols-1 gap-5 md:min-h-[min(72dvh,720px)] md:grid-cols-[330px_minmax(0,1fr)]">
        <aside className={(mobilePane === 'chat' ? 'hidden ' : 'flex ') + 'min-h-0 min-w-0 w-full flex-col md:min-h-[min(72dvh,720px)] md:flex'} style={{ borderColor: C.rule }}>
          <div className="border-b pb-3" style={{ borderColor: C.rule }}>
            <h2 className="text-lg font-semibold" style={{ ...fontDisplay, color: C.ink }}>Chatlar</h2>
          </div>
          <div className="min-h-0 min-w-0 w-full flex-1 space-y-1 overflow-x-hidden overflow-y-auto py-2">
            {loading && chats.length === 0 ? <SectionLoading label="Chatlar yuklanmoqda…" compact />
              : chats.map((chat) => {
                const title = chat.kind === 'direct' ? chat.peer_name || '@' + (chat.peer_username || 'foydalanuvchi') : chat.title;
                const Icon = chat.kind === 'news' ? Megaphone : chat.kind === 'group' ? Users : chat.kind === 'channel' ? Hash : MessageCircle;
                return <button key={chat.id} type="button" onClick={() => selectChat(chat)} className="flex min-w-0 max-w-full items-center gap-2.5 overflow-hidden rounded-xl px-2.5 py-2 text-left" style={{ background: chat.id === selectedId ? C.paperSoft : 'transparent', color: C.ink }}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ color: '#fff', background: CHAT_ACCENTS[chat.kind] }}><Icon size={17} /></span>
                  <span className="min-w-0 flex-1 overflow-hidden">
                    <span className="block min-w-0 truncate text-xs font-semibold">{title || 'Chat'}</span>
                    <span className="mt-1 block max-w-full truncate text-[10px]" style={{ color: C.inkSoft }}>{chat.last_resource_title || chat.last_body || (chat.kind === 'news' ? 'Rasmiy yangiliklar' : chat.is_public ? 'Ommaviy' : 'Yangi chat')}</span>
                    <span className="mt-1.5 flex items-center justify-between gap-2">
                      {chat.last_message_at ? <time className="text-[9px]" style={{ ...fontMono, color: C.inkSoft }}>{shortTime(chat.last_message_at)}</time> : <span />}
                      {chat.unread_count > 0 && <span className="inline-flex min-w-[22px] shrink-0 justify-center rounded-full border px-1.5 py-0.5 text-[9px] leading-none" style={{ ...fontMono, color: C.inkSoft, background: C.paperSoft, borderColor: C.rule }}>{chat.unread_count > 99 ? '99+' : chat.unread_count}</span>}
                    </span>
                  </span>
                </button>;
              })}
            {publicRoomsNotJoined.length > 0 && <div className="pt-3">
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider" style={{ ...fontMono, color: C.inkSoft }}>Ommaviy guruhlar</div>
              {publicRoomsNotJoined.map((chat) => <div key={chat.id} className="flex items-center gap-2 rounded-xl px-2 py-2">
                <span className="grid h-9 w-9 place-items-center rounded-full" style={{ color: C.accent, background: C.paperSoft }}>{chat.kind === 'channel' ? <Hash size={16} /> : <Users size={16} />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold" style={{ color: C.ink }}>{chat.title}</span><span className="text-[10px]" style={{ color: C.inkSoft }}>{chat.member_count} a’zo</span></span>
                <button type="button" onClick={() => joinPublic(chat.id)} disabled={busy} className="rounded-lg px-2 py-1 text-[10px] font-semibold" style={{ ...fontBody, color: C.white, background: C.cover }}>Qo‘shilish</button>
              </div>)}
            </div>}
            {chats.length === 0 && !loading && <p className="px-3 py-6 text-center text-xs" style={{ ...fontBody, color: C.inkSoft }}>Hali chat yo‘q. Odam qidiring yoki guruh yarating.</p>}
          </div>
        </aside>

        <div className={(mobilePane === 'list' ? 'hidden ' : 'flex ') + 'min-h-[min(72dvh,720px)] min-w-0 flex-col md:flex'}>
          {selectedChat ? <>
            <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:px-4" style={{ borderColor: C.rule }}>
              <button type="button" onClick={() => setMobilePane('list')} className="grid h-8 w-8 place-items-center rounded-lg md:hidden" style={{ color: C.inkSoft }} aria-label="Chatlar ro‘yxatiga qaytish"><ArrowLeft size={16} /></button>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ color: '#fff', background: CHAT_ACCENTS[selectedChat.kind] }}>{selectedChat.kind === 'news' ? <Megaphone size={16} /> : selectedChat.kind === 'group' ? <Users size={16} /> : selectedChat.kind === 'channel' ? <Hash size={16} /> : <MessageCircle size={16} />}</span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>{selectedChat.kind === 'direct' ? selectedChat.peer_name || '@' + (selectedChat.peer_username || 'foydalanuvchi') : selectedChat.title}</h2>
                <p className="truncate text-[10px]" style={{ ...fontBody, color: C.inkSoft }}>{selectedChat.kind === 'news' ? 'Official UpCourse page' : selectedChat.kind === 'direct' ? '@' + (selectedChat.peer_username || '') : (selectedChat.is_public ? 'Ommaviy' : 'Maxfiy') + ' · ' + (selectedChat.my_role === 'owner' ? 'egasi' : selectedChat.my_role === 'admin' ? 'admin' : 'a’zo')}</p>
              </div>
              {selectedChat.kind === 'direct' && selectedChat.peer_username && <button type="button" onClick={() => onOpenProfile?.(selectedChat.peer_username)} title="Profilni ochish" className="grid h-8 w-8 place-items-center rounded-lg" style={{ color: C.inkSoft }}><Compass size={16} /></button>}
              {['group', 'channel'].includes(selectedChat.kind) && <button type="button" onClick={() => void loadMembers()} title="A’zolar va taklif" className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px]" style={{ ...fontBody, color: C.inkSoft, background: C.surface, borderColor: C.rule }}><Users size={13} /> A’zolar</button>}
              {canManage && <button type="button" onClick={() => void createInvite()} disabled={inviteBusy} title="Taklif havolasini nusxalash" className="grid h-8 w-8 place-items-center rounded-lg" style={{ color: C.accent }}><Link2 size={16} /></button>}
            </header>

            {invitePrompt && <button type="button" onClick={() => setInvitePrompt('')} className="mx-3 mt-2 break-all rounded-lg p-2 text-left text-[10px]" style={{ ...fontBody, color: C.accent, background: C.paperSoft }}>{invitePrompt}</button>}

            <div ref={messageListRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
              {messageLoading ? <SectionLoading label="Xabarlar yuklanmoqda…" compact />
                : messages.map((message) => {
                  const own = message.sender_id === session.user.id;
                  const attached = !!message.resource_kind;
                  return <div key={message.id} className={'flex ' + (own ? 'justify-end' : 'justify-start')}>
                    <article data-community-message data-message-id={message.id} className="max-w-[88%] rounded-2xl border px-3 py-2" style={{ background: own ? C.paperSoft : C.surface, borderColor: C.rule }}>
                      {!own && message.sender_name && <div className="mb-1 text-[10px] font-semibold" style={{ ...fontBody, color: C.accent }}>{message.sender_name}</div>}
                      {message.body && <p className="whitespace-pre-wrap break-words text-sm" style={{ ...fontBody, color: C.ink }}>{message.body}</p>}
                      {attached && <button type="button" onClick={() => onOpenResource?.(message.resource_kind, message)} className="mt-1 flex min-w-[180px] items-center gap-2 rounded-xl border p-2 text-left" style={{ background: C.paper, borderColor: C.rule }}>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ color: C.accent, background: C.paperSoft }}>{message.resource_kind.includes('test') ? <Share2 size={15} /> : <Hash size={15} />}</span>
                        <span className="min-w-0"><span className="block truncate text-xs font-semibold" style={{ ...fontBody, color: C.ink }}>{message.resource_title || 'Ulashilgan material'}</span><span className="block text-[10px]" style={{ ...fontBody, color: C.inkSoft }}>{message.resource_kind.includes('category') ? 'Soha' : message.resource_kind === 'test' ? 'Test' : 'Kurs mavzusi'}</span></span>
                        <ChevronRight size={14} style={{ color: C.gold }} />
                      </button>}
                      <div className="mt-1 text-right text-[9px]" style={{ ...fontMono, color: C.inkSoft }}>{shortTime(message.created_at)}</div>
                    </article>
                  </div>;
                })}
              {!messageLoading && messages.length === 0 && <div className="my-auto grid min-h-40 place-items-center text-center"><div><span className="mx-auto grid h-10 w-10 place-items-center rounded-2xl" style={{ color: C.accent, background: C.paperSoft }}><MessageCircle size={18} /></span><p className="mt-2 text-xs" style={{ ...fontBody, color: C.inkSoft }}>{selectedChat.kind === 'news' ? 'Yangilik kanali hozircha bo‘sh.' : 'Birinchi xabarni yozing.'}</p></div></div>}
              <div ref={bottomRef} />
            </div>
            {selectedChat.is_member || selectedChat.kind === 'news' && isAdmin ? (
              <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-2 border-t p-2.5 sm:p-3" style={{ borderColor: C.rule }}>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(event); } }} rows={1} maxLength={8000} placeholder={selectedChat.kind === 'news' ? 'Yangilik yozing…' : 'Xabar yozing…'} className="max-h-32 min-h-10 min-w-0 flex-1 resize-y rounded-xl border px-3 py-2 text-sm outline-none" style={{ ...fontBody, color: C.ink, background: C.paper, borderColor: C.rule }} />
                <button type="submit" disabled={sending || !draft.trim()} aria-label="Xabar yuborish" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ color: C.white, background: C.cover, opacity: sending || !draft.trim() ? .55 : 1 }}>{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
              </form>
            ) : (
              <div className="border-t p-3" style={{ borderColor: C.rule }}><button type="button" onClick={() => joinPublic(selectedChat.id)} className="w-full rounded-xl px-3 py-2 text-sm font-semibold" style={{ ...fontBody, color: C.white, background: C.cover }}>Guruhga qo‘shilib yozish</button></div>
            )}
          </> : (
            <div className="grid flex-1 place-items-center p-8 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl" style={{ color: C.accent, background: C.paperSoft }}><MessageCircle size={22} /></span><h2 className="mt-3 text-lg" style={{ ...fontDisplay, color: C.ink }}>Chatni tanlang</h2><p className="mt-1 text-xs" style={{ ...fontBody, color: C.inkSoft }}>Do‘st bilan yozishing yoki guruh/kanal oching.</p></div></div>
          )}
        </div>
      </div>

      {createOpen && <Dialog title="Guruh yoki kanal yaratish" onClose={() => setCreateOpen(false)}>
        <form onSubmit={(event) => void createChat(event)} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {['group', 'channel'].map((kind) => <button key={kind} type="button" onClick={() => setCreateKind(kind)} className="rounded-xl border p-3 text-left" style={{ background: createKind === kind ? C.paperSoft : C.surface, borderColor: createKind === kind ? C.accent : C.rule, color: C.ink }}>
              {kind === 'group' ? <Users size={16} style={{ color: CHAT_ACCENTS.group }} /> : <Hash size={16} style={{ color: CHAT_ACCENTS.channel }} />}
              <span className="mt-1 block text-xs font-semibold" style={{ ...fontBody }}>{kind === 'group' ? 'Guruh' : 'Kanal'}</span>
            </button>)}
          </div>
          <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Nomi<input required minLength={2} maxLength={80} value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={{ background: C.paper, borderColor: C.rule, color: C.ink }} placeholder={createKind === 'group' ? 'Masalan: Matematika guruhi' : 'Masalan: Ingliz tili yangiliklari'} /></label>
          <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Tavsif<input maxLength={500} value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={{ background: C.paper, borderColor: C.rule, color: C.ink }} placeholder="Guruh yoki kanal haqida" /></label>
          <label className="flex items-start gap-2 rounded-xl border p-3 text-xs" style={{ color: C.inkSoft, borderColor: C.rule }}>
            <input type="checkbox" checked={createPublic} onChange={(event) => setCreatePublic(event.target.checked)} />
            <span><span className="block font-semibold" style={{ color: C.ink }}>Ommaviy</span><span>Qidiruvda ko‘rinadi va istagan foydalanuvchi qo‘shila oladi. Belgini olib tashlasangiz, faqat taklif havolasi bilan kiriladi.</span></span>
          </label>
          <button type="submit" disabled={busy || createTitle.trim().length < 2} className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60" style={{ ...fontBody, color: C.white, background: C.cover }}>{busy ? 'Yaratilmoqda…' : 'Yaratish'}</button>
        </form>
      </Dialog>}

      {peopleOpen && <Dialog title={members.length ? 'A’zolar va foydalanuvchilar' : 'Odam qidirish'} wide onClose={() => { setPeopleOpen(false); setMembers([]); }}>
        {members.length > 0 && <div className="mb-3 space-y-1">
          {members.map((member) => <div key={member.id} className="flex items-center gap-2 rounded-lg p-2" style={{ background: C.paper }}>
            <span className="grid h-8 w-8 place-items-center rounded-full text-xs" style={{ color: C.white, background: C.cover }}>{displayName(member).slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium" style={{ color: C.ink }}>{displayName(member)}</span><span className="text-[10px]" style={{ color: C.inkSoft }}>{member.role === 'owner' ? 'Egasi' : member.role === 'admin' ? 'Admin' : 'A’zo'} · @{member.username}</span></span>
          </div>)}
        </div>}
        <label className="block text-xs" style={{ ...fontBody, color: C.inkSoft }}>Foydalanuvchi nomi<input value={peopleQuery} onChange={(event) => setPeopleQuery(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={{ background: C.paper, borderColor: C.rule, color: C.ink }} placeholder="@username yoki ism" /></label>
        {peopleBusy && <SectionLoading label="Qidirilmoqda…" compact />}
        <div className="mt-2 space-y-1">
          {people.map((person) => <div key={person.id} className="flex items-center gap-2 rounded-xl p-2 hover:bg-black/5">
            <button type="button" onClick={() => person.username && onOpenProfile?.(person.username)} className="min-w-0 flex-1 text-left text-xs" style={{ ...fontBody, color: C.ink }}>
              <span className="block truncate font-semibold">{displayName(person)}</span><span style={{ color: C.inkSoft }}>@{person.username}</span>
            </button>
            {selectedChat && canManage && <button type="button" onClick={() => void addMember(person.id)} className="rounded-lg px-2 py-1 text-[10px]" style={{ ...fontBody, color: C.white, background: C.accent }}><UserPlus size={13} className="mr-1 inline" />Qo‘shish</button>}
            {!selectedChat && <button type="button" onClick={() => void startDirect(person.id)} disabled={busy} className="rounded-lg px-2 py-1 text-[10px]" style={{ ...fontBody, color: C.white, background: C.cover }}>Xabar</button>}
          </div>)}
          {peopleQuery.trim().length >= 2 && !peopleBusy && people.length === 0 && <p className="p-4 text-center text-xs" style={{ color: C.inkSoft }}>Foydalanuvchi topilmadi.</p>}
        </div>
      </Dialog>}

      {shareOpen && shareResource && <Dialog title="Chatga ulashish" onClose={() => { setShareOpen(false); onShareHandled?.(); }}>
        <div className="mb-3 rounded-xl border p-3" style={{ background: C.paper, borderColor: C.rule }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ ...fontMono, color: C.accent }}>Ulashiladigan material</div>
          <div className="mt-1 text-sm font-semibold" style={{ ...fontBody, color: C.ink }}>{shareResource.title}</div>
        </div>
        {chats.filter((chat) => chat.kind !== 'news').length
          ? <div className="max-h-64 space-y-1 overflow-y-auto">
              {chats.filter((chat) => chat.kind !== 'news').map((chat) => <button key={chat.id} type="button" onClick={() => void shareToChat(chat)} className="flex w-full items-center gap-2 rounded-xl p-2 text-left hover:bg-black/5">
                <span className="grid h-8 w-8 place-items-center rounded-full" style={{ color: C.white, background: CHAT_ACCENTS[chat.kind] }}>{chat.kind === 'direct' ? <MessageCircle size={14} /> : chat.kind === 'group' ? <Users size={14} /> : <Hash size={14} />}</span>
                <span className="truncate text-xs font-medium" style={{ color: C.ink }}>{chat.kind === 'direct' ? chat.peer_name || '@' + chat.peer_username : chat.title}</span>
              </button>)}
            </div>
          : <p className="py-5 text-center text-xs" style={{ ...fontBody, color: C.inkSoft }}>Avval chat yoki guruh oching.</p>}
        <button type="button" onClick={() => { setShareOpen(false); onShareHandled?.(); }} className="mt-3 text-xs underline" style={{ ...fontBody, color: C.inkSoft }}>Bekor qilish</button>
      </Dialog>}
    </section>
  );
}
