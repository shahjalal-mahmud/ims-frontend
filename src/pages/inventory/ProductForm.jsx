// Placeholder — Product create/edit form ships in Milestone 5.
// See docs/UI_Screens.md §6 and docs/Frontend_Implementation_Roadmap.md.
import { useParams } from 'react-router-dom';
import PlaceholderPage from '../PlaceholderPage';

export default function ProductForm() {
  const { id } = useParams();
  const mode = id ? 'edit' : 'create';
  return (
    <PlaceholderPage
      title={mode === 'edit' ? 'Edit Product' : 'New Product'}
      description={`The product ${mode === 'edit' ? 'edit' : 'create'} form ships in Milestone 5.`}
    />
  );
}
