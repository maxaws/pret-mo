import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BilanHebdo {
  semaine_debut: string;
  semaine_fin: string;
  contenu_ecole_accueil: string;
  temps_ecole_accueil: number;
  contenu_ecole_preteuse: string;
  temps_ecole_preteuse: number;
  commentaire: string;
  statut_accueil: string;
  statut_preteuse: string;
  commentaire_accueil?: string;
  commentaire_preteuse?: string;
  profiles: {
    nom: string;
    prenom: string;
  };
}

interface Frais {
  date: string;
  type_frais: string;
  description: string;
  montant_ttc: number;
  affectation: string;
  part_preteuse?: number;
  part_accueil?: number;
}

interface ClotureData {
  mois: string;
  salarie: {
    nom: string;
    prenom: string;
  };
  bilans: any[];
  heures: any[];
  frais: any[];
  totalHeures: number;
  totalFrais: number;
}

export const exportBilanHebdoPDF = async (bilan: BilanHebdo, fraisSemaine: Frais[]) => {
  const doc = new jsPDF();

  const dateDebut = new Date(bilan.semaine_debut).toLocaleDateString('fr-FR');
  const dateFin = new Date(bilan.semaine_fin).toLocaleDateString('fr-FR');

  doc.setFontSize(18);
  doc.text('Bilan Hebdomadaire', 14, 20);

  doc.setFontSize(12);
  doc.text(`${bilan.profiles.prenom} ${bilan.profiles.nom}`, 14, 30);
  doc.text(`Semaine du ${dateDebut} au ${dateFin}`, 14, 37);

  doc.setFontSize(14);
  doc.text('École d\'accueil', 14, 50);
  doc.setFontSize(11);
  doc.text(`Temps: ${bilan.temps_ecole_accueil}h`, 14, 57);

  const contentAccueil = doc.splitTextToSize(bilan.contenu_ecole_accueil || 'Aucun contenu', 180);
  doc.text(contentAccueil, 14, 64);

  const yAfterAccueil = 64 + (contentAccueil.length * 5) + 10;

  doc.setFontSize(14);
  doc.text('École prêteuse', 14, yAfterAccueil);
  doc.setFontSize(11);
  doc.text(`Temps: ${bilan.temps_ecole_preteuse}h`, 14, yAfterAccueil + 7);

  const contentPreteuse = doc.splitTextToSize(bilan.contenu_ecole_preteuse || 'Aucun contenu', 180);
  doc.text(contentPreteuse, 14, yAfterAccueil + 14);

  const yAfterPreteuse = yAfterAccueil + 14 + (contentPreteuse.length * 5) + 10;

  if (bilan.commentaire) {
    doc.setFontSize(14);
    doc.text('Commentaire du salarié', 14, yAfterPreteuse);
    doc.setFontSize(11);
    const commentaire = doc.splitTextToSize(bilan.commentaire, 180);
    doc.text(commentaire, 14, yAfterPreteuse + 7);
  }

  const yBeforeFrais = yAfterPreteuse + (bilan.commentaire ? 20 : 10);

  if (fraisSemaine.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Frais professionnels de la semaine', 14, 20);

    const fraisRows = fraisSemaine.map(f => [
      new Date(f.date).toLocaleDateString('fr-FR'),
      f.type_frais,
      f.description || '-',
      `${f.montant_ttc.toFixed(2)} €`,
      f.affectation
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Type', 'Description', 'Montant TTC', 'Affectation']],
      body: fraisRows,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    const totalFrais = fraisSemaine.reduce((sum, f) => sum + f.montant_ttc, 0);
    const finalY = (doc as any).lastAutoTable.finalY || 30;
    doc.setFontSize(12);
    doc.text(`Total des frais: ${totalFrais.toFixed(2)} €`, 14, finalY + 10);
  }

  doc.addPage();
  doc.setFontSize(14);
  doc.text('Validation', 14, 20);

  doc.setFontSize(11);
  doc.text(`Statut école d'accueil: ${bilan.statut_accueil}`, 14, 30);
  if (bilan.commentaire_accueil) {
    const commentAccueil = doc.splitTextToSize(`Commentaire accueil: ${bilan.commentaire_accueil}`, 180);
    doc.text(commentAccueil, 14, 37);
  }

  const yPreteuse = bilan.commentaire_accueil ? 50 : 40;
  doc.text(`Statut école prêteuse: ${bilan.statut_preteuse}`, 14, yPreteuse);
  if (bilan.commentaire_preteuse) {
    const commentPreteuse = doc.splitTextToSize(`Commentaire prêteuse: ${bilan.commentaire_preteuse}`, 180);
    doc.text(commentPreteuse, 14, yPreteuse + 7);
  }

  doc.save(`bilan-hebdo-${dateDebut.replace(/\//g, '-')}.pdf`);
};

export const exportCloturePDF = async (cloture: ClotureData) => {
  const doc = new jsPDF();

  const moisDate = new Date(cloture.mois + '-01');
  const moisStr = moisDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  doc.setFontSize(18);
  doc.text('Clôture Mensuelle', 14, 20);

  doc.setFontSize(12);
  doc.text(`${cloture.salarie.prenom} ${cloture.salarie.nom}`, 14, 30);
  doc.text(`Mois: ${moisStr}`, 14, 37);

  doc.setFontSize(14);
  doc.text('Résumé', 14, 50);
  doc.setFontSize(11);
  doc.text(`Total des heures: ${cloture.totalHeures.toFixed(1)}h`, 14, 57);
  doc.text(`Total des frais: ${cloture.totalFrais.toFixed(2)} €`, 14, 64);

  if (cloture.bilans.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Bilans Hebdomadaires', 14, 20);

    const bilansRows = cloture.bilans.map((b: any) => [
      `${new Date(b.semaine_debut).toLocaleDateString('fr-FR')} - ${new Date(b.semaine_fin).toLocaleDateString('fr-FR')}`,
      `${b.temps_ecole_accueil}h`,
      `${b.temps_ecole_preteuse}h`,
      b.statut_accueil,
      b.statut_preteuse
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Semaine', 'Temps Accueil', 'Temps Prêteuse', 'Statut Accueil', 'Statut Prêteuse']],
      body: bilansRows,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });
  }

  if (cloture.heures.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Heures Travaillées', 14, 20);

    const heuresRows = cloture.heures.map((h: any) => {
      const debut = new Date(`2000-01-01T${h.heure_debut}`);
      const fin = new Date(`2000-01-01T${h.heure_fin}`);
      const heures = (fin.getTime() - debut.getTime()) / (1000 * 60 * 60);
      return [
        new Date(h.date).toLocaleDateString('fr-FR'),
        `${h.heure_debut} - ${h.heure_fin}`,
        `${heures.toFixed(1)}h`,
        h.commentaire || '-'
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Horaires', 'Heures', 'Commentaire']],
      body: heuresRows,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });
  }

  if (cloture.frais.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Frais Professionnels', 14, 20);

    const fraisRows = cloture.frais.map((f: any) => [
      new Date(f.date).toLocaleDateString('fr-FR'),
      f.type_frais,
      f.description || '-',
      `${f.montant_ttc.toFixed(2)} €`,
      f.affectation
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Type', 'Description', 'Montant TTC', 'Affectation']],
      body: fraisRows,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });
  }

  doc.save(`cloture-${moisStr.replace(/\s+/g, '-')}.pdf`);
};
