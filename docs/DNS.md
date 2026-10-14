# DNS for verifiedbizlink.co.za

Where the domain's records live, what each one is for, and how to change or
undo them.

## Where things are

| What | Where |
|---|---|
| Domain registration (renewal, owner) | GoDaddy |
| DNS records (the nameservers) | **AWS Route 53**, hosted zone `Z02614172SY3O46G45NQ0`, account `456651118907` |
| Website | AWS Amplify (CloudFront distribution `d383f2bcj2nef7.cloudfront.net`) |
| Email (`info@verifiedbizlink.co.za`) | GoDaddy email (`secureserver.net`) |

Nameservers (set at GoDaddy, published by the `.co.za` registry):

```
ns-1284.awsdns-32.org
ns-20.awsdns-02.com
ns-811.awsdns-37.net
ns-1560.awsdns-03.co.uk
```

## Why Route 53 and not GoDaddy DNS

The bare domain has to point at Amplify. A bare domain cannot be a CNAME, so
that needs an ALIAS-type record, and GoDaddy's DNS does not offer one (its API
rejects the type; AWS's Amplify docs say the same). GoDaddy's workaround is
domain *forwarding*, which only redirected the home page:
`verifiedbizlink.co.za/anything-else` returned 404.

With Route 53 the bare domain is an ALIAS to the Amplify distribution. The app
itself then sends it to `www`, keeping the path (`src/middleware.ts`, constants
in `src/lib/site-url.ts`), so every old or hand-typed bare-domain link works.

## The records

| Name | Type | Value | Purpose |
|---|---|---|---|
| `@` | A + AAAA (ALIAS) | `d383f2bcj2nef7.cloudfront.net` | Bare domain → the app, which redirects to `www` |
| `www` | CNAME | `d383f2bcj2nef7.cloudfront.net` | The website |
| `_e53e1963e8390cedeacc411f57181600` | CNAME | `_a188f308…acm-validations.aws.` | **Proves domain ownership to AWS so the SSL certificate renews.** Delete it and the certificate stops renewing. |
| `@` | MX | `0 smtp.secureserver.net`, `10 mailstore1.secureserver.net` | Incoming email |
| `@` | TXT | `v=spf1 include:secureserver.net -all` | SPF: which servers may send our email |
| `secureserver1._domainkey`, `secureserver2._domainkey` | CNAME | `s1/s2.dkim.verifiedbizlink_co_za.688.onsecureserver.net` | DKIM signing keys for outgoing email |
| `_dmarc` | TXT | `v=DMARC1; p=none` | DMARC in monitor-only mode. Raise to `p=quarantine` once reports show all legitimate mail passes. |
| `email` | CNAME | `email.secureserver.net` | Webmail address |
| `send` | TXT | `v=spf1 include:dc-fd741b8612._spfm.send.verifiedbizlink.co.za ~all` | SPF for GoDaddy's sending subdomain |
| `_autodiscover._tcp` | SRV | `0 0 443 autodiscover.secureserver.net` | Lets mail apps configure themselves |

## Changing a record

Edit it in the Route 53 console (Hosted zones → `verifiedbizlink.co.za`), or:

```
aws route53 change-resource-record-sets --hosted-zone-id Z02614172SY3O46G45NQ0 --change-batch file://change.json
```

Editing records in GoDaddy's DNS page has **no effect** any more: GoDaddy is no
longer asked. Its copy of the zone was left in place only so the move can be
undone.

## Undoing the move

Set the nameservers back to GoDaddy's, at GoDaddy (website, or the `gddy` CLI):

```
gddy domain nameserver set verifiedbizlink.co.za --nameserver ns23.domaincontrol.com --nameserver ns24.domaincontrol.com
```

The bare domain then goes back to home-page-only forwarding. Allow up to 48
hours for the change to reach everyone. Backups of the GoDaddy zone as it was
before the move are in `Documents\verifiedbizlink-dns-backups` on the machine
that made the change.

## History

- **2026-10-13** — Exported the GoDaddy zone (15 records), added the `_dmarc`
  record, created the Route 53 zone with every record copied and the bare
  domain ALIASed to Amplify, and verified each record against GoDaddy's answers
  on all four new nameservers.
- **2026-10-14** — Nameservers switched to Route 53 at GoDaddy.
