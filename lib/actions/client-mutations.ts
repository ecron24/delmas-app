'use server';

import { createServerClient } from '@/lib/supabase/server';

/**
 * Supprime un client (uniquement s'il n'a pas d'interventions)
 * Retourne un objet { success: boolean, message: string, interventionCount?: number }
 */
export async function deleteClient(clientId: string): Promise<{ success: boolean; message: string; interventionCount?: number }> {
  const supabase = createServerClient();

  try {
    // 1. Vérifier si le client a des interventions
    const { data: interventions, error: countError } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select('id')
      .eq('client_id', clientId);

    if (countError) {
      return {
        success: false,
        message: 'Erreur lors de la vérification des interventions',
      };
    }

    const interventionCount = interventions?.length || 0;

    // 2. Si le client a des interventions, empêcher la suppression
    if (interventionCount > 0) {
      return {
        success: false,
        message: `Impossible de supprimer ce client : ${interventionCount} intervention(s) liée(s)`,
        interventionCount,
      };
    }

    // 3. Supprimer le client
    const { error: deleteError } = await supabase
      .schema('piscine_delmas_public')
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (deleteError) {
      console.error('Erreur suppression client:', deleteError);
      return {
        success: false,
        message: 'Erreur lors de la suppression du client',
      };
    }

    return {
      success: true,
      message: 'Client supprimé avec succès',
    };

  } catch (error) {
    console.error('Erreur deleteClient:', error);
    return {
      success: false,
      message: 'Erreur inattendue lors de la suppression',
    };
  }
}
