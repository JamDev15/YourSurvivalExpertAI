import { useEffect } from 'react'

const ensureMeta = (name) => {
  let tag = document.querySelector(`meta[name="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', name)
    document.head.appendChild(tag)
  }
  return tag
}

const ensureMetaProperty = (property) => {
  let tag = document.querySelector(`meta[property="${property}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('property', property)
    document.head.appendChild(tag)
  }
  return tag
}

const ensureCanonical = () => {
  let tag = document.querySelector('link[rel="canonical"]')
  if (!tag) {
    tag = document.createElement('link')
    tag.setAttribute('rel', 'canonical')
    document.head.appendChild(tag)
  }
  return tag
}

const removeJsonLd = () => {
  const nodes = document.querySelectorAll('[data-seo-jsonld="true"]')
  nodes.forEach((node) => node.remove())
}

const appendJsonLd = (jsonLd) => {
  if (!jsonLd) return
  const payloads = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
  payloads.forEach((payload, index) => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-seo-jsonld', 'true')
    script.id = `seo-jsonld-${index}`
    script.textContent = JSON.stringify(payload)
    document.head.appendChild(script)
  })
}

const OG_IMAGE = 'https://yoursurvivalexpert.ai/og-image.svg'

export default function useSeo({ title, description, canonical, jsonLd }) {
  useEffect(() => {
    if (title) {
      document.title = title
      ensureMetaProperty('og:title').setAttribute('content', title)
      ensureMetaProperty('twitter:title').setAttribute('content', title)
    }
    if (description) {
      ensureMeta('description').setAttribute('content', description)
      ensureMetaProperty('og:description').setAttribute('content', description)
      ensureMetaProperty('twitter:description').setAttribute('content', description)
    }
    if (canonical) {
      ensureCanonical().setAttribute('href', canonical)
      ensureMetaProperty('og:url').setAttribute('content', canonical)
    }
    // Always ensure OG image is set
    ensureMetaProperty('og:image').setAttribute('content', OG_IMAGE)
    ensureMetaProperty('twitter:image').setAttribute('content', OG_IMAGE)

    removeJsonLd()
    appendJsonLd(jsonLd)

    return () => {
      removeJsonLd()
    }
  }, [title, description, canonical, jsonLd])
}
