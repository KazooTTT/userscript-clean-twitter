// ==UserScript==
// @name         Clean Twitter
// @namespace    http://antfu.me/
// @version      0.5.0
// @description  Bring back peace on Twitter
// @author       Anthony Fu (https://github.com/antfu)
// @license      MIT
// @homepageURL  https://github.com/antfu/userscript-clean-twitter
// @supportURL   https://github.com/antfu/userscript-clean-twitter
// @match        https://twitter.com/**
// @match        https://x.com/**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitter.com
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-body
// ==/UserScript==

(function () {
  'use strict'

  function useOption(key, title, defaultValue) {
    if (typeof GM_getValue === 'undefined') {
      return {
        value: defaultValue,
      }
    }

    let value = GM_getValue(key, defaultValue)
    const ref = {
      get value() {
        return value
      },
      set value(v) {
        value = v
        GM_setValue(key, v)
        location.reload()
      },
    }

    GM_registerMenuCommand(`${title}: ${value ? '✅' : '❌'}`, () => {
      ref.value = !value
    })

    return ref
  }

  const hideHomeTabs = useOption('twitter_hide_home_tabs', 'Hide Home Tabs', true)
  const hideBlueBadge = useOption('twitter_hide_blue_badge', 'Hide Blue Badges', true)
  const skipDelegateDialog = useOption('twitter_skip_delegate_dialog', 'Skip delegate account switching dialog', true)
  const expandPersonalAccounts = useOption('twitter_expand_personal_accounts', 'Expand drawer of personal accounts', true)

  const style = document.createElement('style')
  const hides = [
    // menu
    '[aria-label="Communities (New items)"], [aria-label="Communities"], [aria-label="Twitter Blue"], [aria-label="Verified"], [aria-label="Timeline: Trending now"], [aria-label="Who to follow"], [aria-label="Search and explore"], [aria-label="Verified Organizations"]',
    // submean
    '* > [href="/i/verified-orgs-signup"]',
    // sidebar
    '[aria-label="Trending"] > * > *:nth-child(3), [aria-label="Trending"] > * > *:nth-child(4), [aria-label="Trending"] > * > *:nth-child(5)',
    // "Verified" tab
    '[role="presentation"]:has(> [href="/notifications/verified"][role="tab"])',
    // "Jobs" tab
    '[href="/jobs"]',
    // verified badge
    hideBlueBadge.value && '*:has(> * > [aria-label="Verified account"])',
    // Home tabs
    hideHomeTabs.value && '[role="tablist"]:has([href="/home"][role="tab"])',
  ].filter(Boolean)

  style.innerHTML = [
    `${hides.join(',')}{ display: none !important; }`,
    // styling
    '[aria-label="Search Twitter"] { margin-top: 20px !important; }',
  ].join('')

  document.body.appendChild(style)

  function selectedFollowingTab() {
    if (hideHomeTabs.value) {
      if (window.location.pathname === '/home') {
        const tabs = document.querySelectorAll('[href="/home"][role="tab"]')
        if (tabs.length === 2 && tabs[1].getAttribute('aria-selected') === 'false')
          tabs[1].click()
      }
    }
  }

  function hideDiscoverMore() {
    const conversations = document.querySelector('[aria-label="Timeline: Conversation"]')?.children[0]
    if (!conversations)
      return

    let hide = false
    Array.from(conversations.children).forEach((el) => {
      if (hide) {
        el.style.display = 'none'
        return
      }

      const span = el.querySelector('h2 > div > span')

      if (span?.textContent.trim() === 'Discover more') {
        hide = true
        el.style.display = 'none'
      }
    })
  }

  // Select "Following" tab on home page, if not
  window.addEventListener('load', () => {
    setTimeout(() => {
      selectedFollowingTab()
      hideDiscoverMore()
    }, 500)
    // TODO: use a better way to detect the tab is loaded
    setTimeout(() => {
      hideDiscoverMore()
    }, 1500)
    hideDiscoverMore()
  })

  if (expandPersonalAccounts.value) {
    let timer
    const ob = new MutationObserver((mut) => {
      if (!mut.some(m => m.addedNodes.length))
        return
      if (timer)
        clearTimeout(timer)
      timer = setTimeout(() => {
        const personalAccount = [...document.querySelectorAll('svg')].find(i => i.parentElement.textContent?.trim() === 'Personal accounts')?.parentElement
        if (!personalAccount || !personalAccount.nextSibling)
          return
        const nextElement = personalAccount.nextSibling
        if (nextElement.tagName !== 'BUTTON') {
          personalAccount.click()
        }
      }, 200)
    })
    ob.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  if (skipDelegateDialog.value) {
    const ob = new MutationObserver((mut) => {
      if (!mut.some(m => m.addedNodes.length))
        return
      const dialog = document.querySelector('[data-testid="sheetDialog"]')
      if (!dialog)
        return
      const text = dialog.textContent.toLowerCase()
      if (!text.includes('switch to a delegate account')) {
        // eslint-disable-next-line no-console
        console.debug('[Clean Twitter] Dialog is not detected as a "delegate account switching" dialog', dialog)
        return
      }

      const buttons = [...dialog.querySelectorAll('button')]

      const confrim = buttons.find(el => el.textContent.toLowerCase().includes('switch accounts'))

      if (!confrim) {
        // eslint-disable-next-line no-console
        console.debug('[Clean Twitter] Confirm button not found', dialog)
        return
      }

      confrim.click()
    })

    ob.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }
})()
