(() => {
  const HANDOFF_REPLY = 'I don’t have a reliable answer for that yet. I can pass your question to the Zanove team. Add your email if you’d like them to reply.';

  const quickAnswer = (question) => {
    const q = question.toLowerCase().replace(/[^a-z0-9@.+\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (/\b(service|services|do you do|what do you|can zanove|can you help|help with)\b/.test(q)) {
      return 'Zanove works across website and web design, software and digital products, brand design, SEO and content, AI video and image creative, and AI workflow automation. Tell me what you’re trying to achieve and I can point you toward a useful starting point.';
    }
    if (/\b(price|pricing|cost|how much|quote|budget)\b/.test(q)) {
      return 'Project cost depends on the scope and what you need built. I don’t have a current price list, so I won’t guess. Use “Send to Zanove” and the team can discuss your needs and prepare the right next step.';
    }
    if (/\b(audit|website check|site check|review my website)\b/.test(q)) {
      return 'You can run the free first-pass website audit at /audit.html. It checks public pages for website structure, search signals, enquiry paths and visible workflow signals. The on-page report points out opportunities, and you can ask Zanove to help you plan the fixes.';
    }
    if (/\b(zanvera|guest hub|guest assistant)\b/.test(q)) {
      return 'Zanvera Guest Hub is a founder-built hospitality concept: guests scan a QR code to get answers about Wi-Fi, check-in and amenities, while hosts manage useful guest information in one place. Open it from the Projects page to explore.';
    }
    if (/\b(no wahala|nowahala)\b/.test(q)) {
      return 'No Wahala is a founder-built personal finance dashboard designed to make statement activity easier to understand, with a clearer view of money in, money out and repeat payments. Open it from the Projects page to explore.';
    }
    if (/\b(legacymag|legacy mag|birthday booklet|booklet)\b/.test(q)) {
      return 'LegacyMag is a founder-built keepsake booklet service for milestone birthdays, memorials and anniversaries. Its landing page presents the idea of turning personal stories and photographs into a lasting magazine-style booklet.';
    }
    if (/\b(datawise|data wise)\b/.test(q)) {
      return 'DataWise is a founder-built Nigerian data bundle comparison and personal tracking experience. It helps people compare plans and keep an eye on usage, top-ups and expiry dates.';
    }
    if (/\b(globalperks|dark rosy|visual portfolio)\b/.test(q)) {
      return 'GlobalPerks is a founder-built visual storytelling portfolio focused on expressive imagery, curated moments and a gallery-led presentation.';
    }
    if (/\b(project|portfolio|work|case stud|hirelyze|kudiplan|my family companion|nlbcs|nledc)\b/.test(q)) {
      return 'The Projects page leads with five founder-built experiences: Zanvera Guest Hub, No Wahala, LegacyMag, DataWise and GlobalPerks. It also includes selected additional work. Open Projects from the menu to explore.';
    }
    if (/\b(book|ebook|written|author)\b/.test(q)) {
      return 'Zanove’s Books page is where the books and written resources will be featured. Open Books from the main menu to see what is available.';
    }
    if (/\b(contact|email|call|talk|speak|human|team|person|book a call)\b/.test(q)) {
      return 'You can email zanovetechnologies@gmail.com to arrange a call. Or choose “Send to Zanove” here and the team will receive your question by email.';
    }
    if (/\b(location|where are you|based|country|nigeria)\b/.test(q)) {
      return 'Zanove Technologies is a digital services company based in Nigeria. Use “Send to Zanove” if you need to confirm availability for a specific location or time zone.';
    }
    if (/\b(timeline|how long|delivery|deadline|when can)\b/.test(q)) {
      return 'Timing depends on the work, scope and starting materials. I don’t have a reliable timeline to promise here. Send a short description to the Zanove team and they can talk through the next step.';
    }
    if (/\b(automation|automate|workflow|ai agent)\b/.test(q)) {
      return 'Good automation candidates are repetitive steps with clear rules, such as routing enquiries, updating records, drafting routine follow-ups or moving information between tools. Start by describing one task that takes time; Zanove can help assess whether a simple workflow or AI-assisted automation fits.';
    }
    if (/\b(ai video|video|reel|short form|image generation|ai image|creative)\b/.test(q)) {
      return 'Zanove offers AI video and image creative. A useful brief includes the audience, the message, the platform and the action viewers should take. The Projects page links to ZanoveTech’s Instagram creative.';
    }
    return '';
  };

  function setupChat(root) {
    const form = root.querySelector('[data-ask-form]');
    const input = root.querySelector('[data-ask-input]');
    const messagesNode = root.querySelector('[data-ask-messages]');
    const errorNode = root.querySelector('[data-ask-error]');
    const submit = root.querySelector('[data-ask-submit]');
    const countNode = root.querySelector('[data-ask-count]');
    const handoffForm = root.querySelector('[data-ask-handoff-form]');
    const handoffMessage = handoffForm?.elements.message;
    if (!form || !input || !messagesNode || !submit) return;

    const widget = root.closest('[data-ask-widget]');
    const launcher = widget?.querySelector('[data-ask-launcher]');
    const panel = widget?.querySelector('[data-ask-panel]');
    const openChat = () => {
      if (!widget || !launcher || !panel) return;
      panel.hidden = false;
      launcher.setAttribute('aria-expanded', 'true');
      launcher.setAttribute('aria-label', 'Close Ask Zanove AI');
      window.setTimeout(() => input.focus(), 50);
    };
    const closeChat = () => {
      if (!widget || !launcher || !panel) return;
      panel.hidden = true;
      launcher.setAttribute('aria-expanded', 'false');
      launcher.setAttribute('aria-label', 'Open Ask Zanove AI');
      launcher.focus();
    };
    launcher?.addEventListener('click', () => launcher.getAttribute('aria-expanded') === 'true' ? closeChat() : openChat());
    widget?.querySelector('[data-ask-close]')?.addEventListener('click', closeChat);

    let history = [];
    let messageCount = 0;
    let latestQuestion = '';
    const addMessage = (role, content) => {
      const wrapper = document.createElement('div');
      wrapper.className = `ask-message ${role}`;
      if (role === 'assistant') {
        const avatar = document.createElement('span');
        avatar.className = 'ask-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = 'Z';
        wrapper.append(avatar);
      }
      const text = document.createElement('p');
      text.textContent = content;
      wrapper.append(text);
      messagesNode.append(wrapper);
      messagesNode.scrollTop = messagesNode.scrollHeight;
      return wrapper;
    };
    const updateCount = () => { if (countNode) countNode.textContent = `${messageCount} / 20 messages`; };
    const showHumanForm = (question = latestQuestion) => {
      if (!handoffForm) return;
      if (handoffMessage && question && !handoffMessage.value.trim()) handoffMessage.value = question;
      handoffForm.hidden = false;
      if (widget) handoffForm.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      handoffForm.querySelector('input[name="email"]')?.focus();
    };

    async function ask(question) {
      const clean = question.trim();
      if (!clean || submit.disabled) return;
      if (messageCount >= 20) {
        if (errorNode) { errorNode.textContent = 'You’ve reached the message limit for this chat. Send your question to Zanove or email us directly.'; errorNode.hidden = false; }
        showHumanForm(clean);
        return;
      }
      if (errorNode) errorNode.hidden = true;
      latestQuestion = clean;
      window.zanoveTrack?.('ask_ai_question_sent');
      input.value = '';
      addMessage('user', clean);
      messageCount += 1;
      updateCount();

      const localAnswer = quickAnswer(clean);
      if (localAnswer) {
        addMessage('assistant', localAnswer);
        history = [...history, { role: 'user', content: clean }, { role: 'assistant', content: localAnswer }].slice(-8);
        return;
      }

      const recentHistory = history.slice(-6).map(({ role, content }) => ({ role, content: content.slice(-900) }));
      const conversation = [...recentHistory, { role: 'user', content: clean }];
      const pending = addMessage('assistant', 'Thinking through that…');
      pending.classList.add('is-pending');
      submit.disabled = true;
      input.disabled = true;
      const oldButton = submit.textContent;
      submit.textContent = 'Thinking…';
      try {
        const response = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: conversation }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.needsHuman) {
          pending.remove();
          addMessage('assistant', payload.answer || HANDOFF_REPLY);
          showHumanForm(clean);
          return;
        }
        if (typeof payload.answer !== 'string' || !payload.answer.trim()) throw new Error('No answer was returned.');
        pending.classList.remove('is-pending');
        pending.querySelector('p').textContent = payload.answer;
        history = [...conversation, { role: 'assistant', content: payload.answer }].slice(-8);
      } catch {
        pending.remove();
        addMessage('assistant', HANDOFF_REPLY);
        showHumanForm(clean);
      } finally {
        submit.disabled = false;
        input.disabled = false;
        submit.innerHTML = `${oldButton.includes('Send') ? 'Send' : 'Ask'} <span aria-hidden="true">↗</span>`;
        if (!handoffForm || handoffForm.hidden) input.focus();
      }
    }

    form.addEventListener('submit', (event) => { event.preventDefault(); ask(input.value); });
    root.querySelectorAll('[data-ask-prompt]').forEach((button) => {
      if (!button.textContent.trim()) button.textContent = button.dataset.askPrompt;
      button.addEventListener('click', () => ask(button.dataset.askPrompt));
    });
    root.querySelector('[data-ask-reset]')?.addEventListener('click', () => {
      history = [];
      messageCount = 0;
      latestQuestion = '';
      messagesNode.replaceChildren();
      addMessage('assistant', 'Hi, I’m Zanove’s AI assistant. I can answer common questions about our services, projects and website audit. Ask me anything, or send your question to our team.');
      if (errorNode) errorNode.hidden = true;
      if (handoffForm) { handoffForm.reset(); handoffForm.hidden = true; }
      updateCount();
    });
    root.querySelector('[data-ask-human]')?.addEventListener('click', () => showHumanForm());

    handoffForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const sendButton = handoffForm.querySelector('button[type="submit"]');
      const message = handoffMessage?.value.trim() || '';
      const name = handoffForm.elements.name.value.trim();
      const email = handoffForm.elements.email.value.trim();
      if (message.length < 3) {
        if (errorNode) { errorNode.textContent = 'Add your question before sending it to Zanove.'; errorNode.hidden = false; }
        handoffMessage?.focus();
        return;
      }
      sendButton.disabled = true;
      sendButton.textContent = 'Sending…';
      if (errorNode) errorNode.hidden = true;
      try {
        const response = await fetch('/api/ask/handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, message }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'We could not send your message.');
        window.zanoveTrack?.('ask_ai_handoff_sent');
        handoffForm.hidden = true;
        addMessage('assistant', 'Your question has been sent to the Zanove team. We’ll reply to the email address you provided. If you need us sooner, email zanovetechnologies@gmail.com.');
      } catch (error) {
        if (errorNode) {
          errorNode.textContent = `${error.message} You can email us directly: zanovetechnologies@gmail.com.`;
          errorNode.hidden = false;
        }
      } finally {
        sendButton.disabled = false;
        sendButton.textContent = 'Send to Zanove';
      }
    });
  }

  document.querySelectorAll('[data-ask-chat]').forEach(setupChat);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.querySelectorAll('[data-ask-widget]').forEach((widget) => {
        const launcher = widget.querySelector('[data-ask-launcher]');
        if (launcher?.getAttribute('aria-expanded') === 'true') launcher.click();
      });
    }
  });
})();
