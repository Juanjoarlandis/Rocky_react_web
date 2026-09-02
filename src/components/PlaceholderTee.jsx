import React from 'react';
import { CURRENT_DROP } from '../config/campaign.js';
import '../styles/components/placeholder-tee.css';

const UNRELEASED_MOCKUP = '/products/placeholder-unreleased.webp';

function PlaceholderTee({ title = '', compact = false, priority = false, label = 'Diseño bajo llave' }) {
    return (
        <span
            role="img"
            aria-label={`${title} — diseño todavía sin revelar`}
            className={`placeholder-tee${compact ? ' placeholder-tee--compact' : ''}`}
        >
            <img
                src={UNRELEASED_MOCKUP}
                alt=""
                width="1254"
                height="1254"
                decoding={priority ? 'auto' : 'async'}
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : undefined}
                draggable="false"
                className="placeholder-tee__image"
            />
            {!compact && (
                <span className="placeholder-tee__label" aria-hidden="true">
                    <span>{CURRENT_DROP.shortTitle} · sin revelar</span>
                    <strong>{label}</strong>
                </span>
            )}
        </span>
    );
}

export default PlaceholderTee;
