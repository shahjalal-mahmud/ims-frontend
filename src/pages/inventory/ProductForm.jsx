// src/pages/inventory/ProductForm.jsx
// Create + edit form for a product. Per docs/UI_Screens.md §6.
//
// Routes:
//   /inventory/products/new         → create mode
//   /inventory/products/:id/edit    → edit mode (prefills from /products/get.php)
//
// Quantity is NEVER editable through this module — the field is server
// managed via Stock In / Stock Out (docs/UI_Screens.md §6 and
// docs/FRONTEND_API_INTEGRATION_GUIDE.md §4.5). It appears only as a
// read-only label on edit, so the user can see the current value.

import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import EmptyState from '../../components/ui/EmptyState';
import ProductFormFields from '../../components/domain/ProductFormFields';
import {
  useCategories,
} from '../../queries/useCategoryQueries';
import {
  useSuppliers,
} from '../../queries/useSupplierQueries';
import {
  useCreateProduct,
  useProduct,
  useUpdateProduct,
} from '../../queries/useProductQueries';
import { productSchema } from '../../lib/validators';
import { applyServerErrors, getErrorMessage } from '../../lib/errors';

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  // For prefill on edit.
  const productQuery = useProduct(id);

  // Dropdowns.
  const categoriesQuery = useCategories();
  const suppliersQuery = useSuppliers();

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const mutation = isEdit ? updateMutation : createMutation;

  // Default values:
  //   create → empty form
  //   edit   → prefilled from the fetched product (with quantity stripped
  //            from any value the form manages — it doesn't manage it,
  //            but the schema rejects unknown keys so we keep it off the
  //            payload by never naming it in defaultValues either).
  const defaults = useMemo(() => {
    if (isEdit && productQuery.data) {
      const p = productQuery.data;
      return {
        name: p.name ?? '',
        categoryId: p.categoryId ?? '',
        supplierId: p.supplierId ?? '',
        purchasePrice:
          p.purchasePrice !== undefined && p.purchasePrice !== null
            ? String(p.purchasePrice)
            : '',
        sellingPrice:
          p.sellingPrice !== undefined && p.sellingPrice !== null
            ? String(p.sellingPrice)
            : '',
        minStockLevel:
          p.minStockLevel !== undefined && p.minStockLevel !== null
            ? String(p.minStockLevel)
            : '',
      };
    }
    return {
      name: '',
      categoryId: '',
      supplierId: '',
      purchasePrice: '',
      sellingPrice: '',
      minStockLevel: '',
    };
  }, [isEdit, productQuery.data]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: defaults,
  });

  // Re-seed the form whenever the fetched product first arrives.
  useEffect(() => {
    if (isEdit && productQuery.data) {
      reset(defaults);
    }
  }, [defaults, isEdit, productQuery.data, reset]);

  // 404 on prefill → toast + redirect per UI Screens §6.
  useEffect(() => {
    if (!isEdit) return;
    if (productQuery.isError) {
      const status = productQuery.error?.response?.status;
      if (status === 404) {
        toast.error('Product not found');
        navigate('/inventory/products', { replace: true });
      }
    }
  }, [isEdit, productQuery.error, productQuery.isError, navigate]);

  const onSubmit = (values) => {
    // Defensive — quantity is never on the schema, but if anything ever
    // sneaks in (e.g. a stale defaultValues), drop it before mutation.
    const payload = { ...values };
    delete payload.quantity;

    // Coerce numeric fields explicitly so the wire format is clean.
    // (Zod already coerced during validation, but we re-read from values
    // because that's what the resolver produced.)
    const cleanPayload = {
      name: payload.name,
      categoryId: Number(payload.categoryId),
      supplierId: Number(payload.supplierId),
      purchasePrice: Number(payload.purchasePrice),
      sellingPrice: Number(payload.sellingPrice),
      ...(payload.minStockLevel !== '' && payload.minStockLevel != null
        ? { minStockLevel: Number(payload.minStockLevel) }
        : {}),
    };

    if (isEdit) {
      updateMutation.mutate(
        { id, ...cleanPayload },
        {
          onSuccess: (response) => {
            toast.success(response?.data?.message || 'Product updated');
            navigate('/inventory/products');
          },
          onError: (err) => {
            const status = err.response?.status;
            if (status === 422) {
              applyServerErrors({ setError }, err.response.data?.errors);
              return;
            }
            if (status === 401) return; // global interceptor
            toast.error(getErrorMessage(err));
          },
        }
      );
    } else {
      createMutation.mutate(cleanPayload, {
        onSuccess: (response) => {
          toast.success(response?.data?.message || 'Product created');
          navigate('/inventory/products');
        },
        onError: (err) => {
          const status = err.response?.status;
          if (status === 422) {
            applyServerErrors({ setError }, err.response.data?.errors);
            return;
          }
          if (status === 401) return; // global interceptor
          toast.error(getErrorMessage(err));
        },
      });
    }
  };

  // Loading skeleton while the prefill fetch is in flight (edit mode only).
  if (isEdit && productQuery.isPending) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  // Show a soft error if the prefill fetch failed (404 case is auto-redirected
  // above; anything else falls through to a banner).
  if (isEdit && productQuery.isError && productQuery.error?.response?.status !== 404) {
    return (
      <Card className="border-error/40 bg-error/5">
        <p className="text-error font-medium">Couldn't load product</p>
        <p className="text-sm text-base-content/70">
          {getErrorMessage(productQuery.error)}
        </p>
        <div className="mt-3">
          <Button variant="ghost" onClick={() => navigate('/inventory/products')}>
            <ArrowLeft size={16} />
            Back to products
          </Button>
        </div>
      </Card>
    );
  }

  const pending = mutation.isPending;

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/inventory/products')}
          disabled={pending}
        >
          <ArrowLeft size={16} />
          Back to products
        </Button>
      </div>

      <Card>
        <h2 className="text-lg font-medium mb-2">
          {isEdit ? 'Edit Product' : 'New Product'}
        </h2>
        <p className="text-sm text-base-content/60 mb-4">
          {isEdit
            ? 'Update the product details. Quantity is managed through Stock In / Stock Out.'
            : 'Create a new product. New products start with quantity 0.'}
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <fieldset
            disabled={pending}
            className="flex flex-col gap-4 m-0 p-0 border-0"
          >
            <ProductFormFields
              register={register}
              errors={errors}
              categories={categoriesQuery.data ?? []}
              suppliers={suppliersQuery.data ?? []}
              mode={isEdit ? 'edit' : 'create'}
              quantity={productQuery.data?.quantity}
            />
          </fieldset>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => navigate('/inventory/products')}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={pending}
              disabled={
                pending ||
                categoriesQuery.isPending ||
                suppliersQuery.isPending
              }
            >
              <Save size={16} />
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Soft fallback if categories or suppliers are empty — the dropdowns
          will still render but be useless. Rare in production. */}
      {!categoriesQuery.isPending &&
        !suppliersQuery.isPending &&
        (!categoriesQuery.data?.length || !suppliersQuery.data?.length) && (
          <EmptyState
            title="Missing reference data"
            description="You need at least one category and one supplier before creating products."
          />
        )}
    </div>
  );
}