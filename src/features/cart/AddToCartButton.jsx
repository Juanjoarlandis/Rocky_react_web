import '../../styles/components/add-to-cart.css';
import { useEffect, useRef, useState } from 'react';

function AddToCartButton({
  product,
  variantId = null,
  addToCart,
  className = '',
  disabled = false,
  unavailableLabel = 'Agotado',
}) {
  const [added, setAdded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleClick = async () => {
    setPending(true);
    setError('');
    try {
      await addToCart(product, variantId);
      setAdded(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setAdded(false), 1200);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'No se ha podido añadir.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="add-to-cart-control">
      <button
        type="button"
        className={`btn btn--primary ${added ? 'btn--added' : ''} ${className}`}
        onClick={handleClick}
        disabled={disabled || pending}
      >
        {disabled
          ? unavailableLabel
          : pending
            ? 'Añadiendo…'
            : added
              ? 'Añadido ✓'
              : 'Añadir al carrito'}
      </button>
      {error && (
        <span className="commerce-inline-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default AddToCartButton;
